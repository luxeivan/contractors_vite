import {
  getAllContractors,
  getAllContracts,
  getAllPurposes,
} from "../../lib/getData";
import {
  Table,
  Space,
  Flex,
  Button,
  Tag,
  Select,
  Tooltip,
  Input,
  Modal,
  Typography,
} from "antd";
import { debounce } from "lodash";
import React, { useEffect, useState, useMemo } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";
import useAuth from "../../store/authStore";
import { server } from "../../config";

import ModalViewContract from "./ModalViewContract";
import ModalAddContract from "./ModalAddContract";
import CommentDrawer from "./CommentDrawer";

const { Text } = Typography;

const defaultPageSize = 10;
const defaultPage = 1;

export default function TableContract() {
  const { user } = useAuth((store) => store);

  // ─────────────── state ───────────────
  const [pagination, setPagination] = useState();
  const [allContracts, setAllContracts] = useState();
  const [allPurposes, setAllPurposes] = useState([]);
  const [listContractors, setListContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  // модалки / drawer
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false);
  const [docIdForModal, setDocIdForModal] = useState(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentContract, setCommentContract] = useState(null);
  const [commentsCount, setCommentsCount] = useState({});

  const [onlyAtWork, setOnlyAtWork] = useState(0);
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [searchTask, setSearchTask] = useState("");
  const [stepsFilter, setStepsFilter] = useState(null);
  const debouncedTask = useMemo(
    () => debounce((v) => setSearchTask(v.trim()), 500),
    []
  );

  // 1) Загрузить список назначений (purpose)
  const fetchPurposes = async () => {
    try {
      const res = await getAllPurposes(100, 1);
      const temp = res.data
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      temp.unshift({ value: null, label: "Все" });
      setAllPurposes(temp);
    } catch (error) {
      console.error("fetchPurposes error:", error);
    }
  };

  // 2) Загрузить список подрядчиков (contractor)
  const fetchContractors = async () => {
    try {
      const res = await getAllContractors(1000, 1);
      const temp = res.data
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      temp.unshift({ value: null, label: "Все" });
      setListContractors(temp);
    } catch (error) {
      console.error("fetchContractors error:", error);
    }
  };

  const fetchContracts = async (
    pageSize = defaultPageSize,
    page = defaultPage
  ) => {
    try {
      setLoading(true);

      const fetchChunk = (p) =>
        getAllContracts(100, p, {
          contractorId: selectedContractor || undefined,
          completed: onlyAtWork,
          purposeId: selectedPurpose || undefined,
        });

      let tempResp;

      if (searchTask || stepsFilter !== null) {
        const first = await fetchChunk(1);
        const pageCount = first.meta.pagination.pageCount;

        if (pageCount > 1) {
          const rest = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, i) => fetchChunk(i + 2))
          );
          first.data.push(...rest.flatMap((r) => r.data));
        }
        tempResp = first;
      } else {
        tempResp = await getAllContracts(pageSize, page, {
          contractorId: selectedContractor || undefined,
          completed: onlyAtWork,
          purposeId: selectedPurpose || undefined,
        });
      }

      let filtered = tempResp.data;

      // 3.1. Поиск по номеру ТЗ
      if (searchTask) {
        filtered = filtered.filter((c) =>
          (c.numberTask || "").toLowerCase().includes(searchTask.toLowerCase())
        );
      }

      // 3.2. Фильтр «Наличие этапов»
      if (stepsFilter === "zero") {
        filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
      } else if (stepsFilter === "nonzero") {
        filtered = filtered.filter((c) => (c.steps?.length || 0) > 0);
      }

      const patched =
        searchTask || stepsFilter !== null
          ? {
              ...tempResp,
              data: filtered,
              meta: {
                ...tempResp.meta,
                pagination: {
                  ...tempResp.meta.pagination,
                  total: filtered.length,
                  pageCount: Math.ceil(
                    filtered.length / tempResp.meta.pagination.pageSize
                  ),
                },
              },
            }
          : tempResp;

      setAllContracts(patched);
    } catch (e) {
      console.error("fetchContracts error:", e);
    } finally {
      setLoading(false);
    }
  };

  // 4) Считаем количество комментариев для каждой записи
  useEffect(() => {
    if (!allContracts?.data) return;

    const fetchCommentsCount = async () => {
      const counts = {};
      const jwt = localStorage.getItem("jwt");

      await Promise.all(
        allContracts.data.map(async (contract) => {
          try {
            const res = await axios.get(
              `${server}/api/comments?filters[contract][id][$eq]=${contract.id}`,
              {
                headers: { Authorization: `Bearer ${jwt}` },
              }
            );
            counts[contract.id] = res.data.meta?.pagination?.total || 0;
          } catch {
            counts[contract.id] = 0;
          }
        })
      );

      setCommentsCount(counts);
    };

    fetchCommentsCount();
  }, [allContracts]);

  // ─────────────── эффекты загрузки ───────────────

  // При изменении фильтров (contractor, status, purpose, searchTask, stepsFilter)
  useEffect(() => {
    fetchContracts(
      pagination?.pageSize || defaultPageSize,
      pagination?.current || defaultPage
    );
    return () => debouncedTask.cancel();
  }, [
    selectedContractor,
    onlyAtWork,
    selectedPurpose,
    searchTask,
    stepsFilter,
  ]);

  // При первом рендере – загрузить списки «Назначения» и «Подрядчики»
  useEffect(() => {
    fetchPurposes();
    fetchContractors();
  }, []);

  // ─────────────── колонки таблицы ───────────────
  const columns = [
    {
      title: "Номер договора",
      dataIndex: "number",
      key: "number",
    },
    {
      title: "Дата договора",
      dataIndex: "dateContract",
      key: "dateContract",
      render: (d) => <span>{dayjs(d).format("DD.MM.YYYY")}</span>,
    },
    {
      title: "Предмет договора",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Номер Тех.Задания",
      dataIndex: "numberTask",
      key: "numberTask",
    },
    {
      title: "Назначение",
      dataIndex: "purpose",
      key: "purpose",
      render: (p) => (p ? <Tag color={p.color}>{p.name}</Tag> : "-"),
    },
    {
      title: "Кол-во выполненных этапов",
      dataIndex: "stepsComplited",
      key: "stepsComplited",
    },
    {
      title: "Подрядчик",
      dataIndex: "contractor",
      key: "contractor",
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      render: (completed) =>
        completed ? (
          <Tag color="volcano">Архивный</Tag>
        ) : (
          <Tag color="green">В работе</Tag>
        ),
    },
  ];

  if (user?.role?.type !== "readadmin") {
    columns.push({
      title: "Действия",
      key: "action",
      render: (_, record) => (
        <>
          <Space size="middle">
            <a onClick={() => openModal(record.documentId)}>Открыть договор</a>
          </Space>
          <Space size="middle">
            <a
              onClick={() => {
                setCommentContract(record);
                setIsCommentsOpen(true);
              }}
            >
              Комментарии
            </a>
          </Space>
        </>
      ),
    });
  }

  // ─────────────── подготовка данных для таблицы ───────────────
  const data = allContracts?.data?.map((item) => ({
    key: item.id,
    id: item.id,
    documentId: item.documentId,
    number: item.number,
    dateContract: item.dateContract,
    description: item.description,
    contractor: item.contractor?.name || "-",
    numberTask: item.numberTask,
    purpose: item.purpose,
    stepsComplited: item.steps?.length || 0,
    status: item.completed,
  }));

  // ─────────────── обработчики ───────────────
  const handlerReload = () => {
    // сбросим все фильтры и перезагрузим первую страницу
    setSelectedContractor(null);
    setOnlyAtWork(0);
    setSelectedPurpose(null);
    setSearchTask("");
    setStepsFilter(null);
    fetchContracts(defaultPageSize, defaultPage);
  };

  const handlerChange = (pag) => {
    setPagination(pag);
    fetchContracts(pag.pageSize, pag.current);
  };

  const handlerAddNewContract = () => {
    setIsOpenModalAddContract(true);
  };

  const openModal = (docId) => {
    setDocIdForModal(docId);
    setIsOpenModal(true);
  };

  const closeModal = () => {
    setDocIdForModal(null);
    setIsOpenModal(false);
  };

  const closeAddModal = () => {
    setIsOpenModalAddContract(false);
  };

  // ─────────────── JSX ───────────────
  return (
    <>
      {/* ─────────────── ФИЛЬТРЫ (две строки) ─────────────── */}
      {/* Первая строка фильтров */}
      <Flex justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Space size="middle" align="center">
          {/* Статус */}
          <Space align="center">
            <Text>Статус:</Text>
            <Select
              value={onlyAtWork}
              style={{ width: 140 }}
              onChange={(val) => setOnlyAtWork(val)}
              options={[
                { value: 0, label: "Все" },
                { value: 1, label: "В работе" },
                { value: 2, label: "Архивный" },
              ]}
            />
          </Space>

          {/* Назначение */}
          <Space align="center">
            <Text>Назначение:</Text>
            <Select
              value={selectedPurpose}
              style={{ width: 180 }}
              onChange={(val) => setSelectedPurpose(val)}
              options={allPurposes}
            />
          </Space>

          {/* Поиск по № Тех.Задания */}
          <Input
            placeholder="Поиск по № Тех.Задания"
            allowClear
            style={{ width: 220 }}
            onChange={(e) => debouncedTask(e.target.value)}
          />
        </Space>

        <Space size="middle" align="center">
          <Tooltip title="Сброс фильтров">
            <a onClick={handlerReload}>
              <ReloadOutlined style={{ fontSize: 18 }} />
            </a>
          </Tooltip>
          {user?.role?.type !== "readadmin" && (
            <Button type="primary" onClick={handlerAddNewContract}>
              Добавить новый договор
            </Button>
          )}
        </Space>
      </Flex>

      {/* Вторая строка фильтров */}
      <Flex justify="flex-start" align="middle" style={{ marginBottom: 20 }}>
        <Space size="middle" align="center">
          {/* Наличие этапов */}
          <Space align="center">
            <Text>Наличие этапов:</Text>
            <Select
              value={stepsFilter}
              style={{ width: 160 }}
              onChange={(val) => setStepsFilter(val)}
              options={[
                { value: null, label: "Все" },
                { value: "zero", label: "0 этапов" },
                { value: "nonzero", label: "> 0 этапов" },
              ]}
            />
          </Space>

          {/* Подрядчик */}
          <Space align="center">
            <Text>Подрядчик:</Text>
            <Select
              value={selectedContractor}
              showSearch
              optionFilterProp="label"
              style={{ width: 260 }}
              placeholder="Выберите подрядчика"
              onChange={(val) => setSelectedContractor(val)}
              options={listContractors}
            />
          </Space>
        </Space>
      </Flex>

      {/* ─────────────── Таблица ─────────────── */}
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        style={{ width: "100%" }}
        pagination={{
          current: pagination?.current || defaultPage,
          pageSize: pagination?.pageSize || defaultPageSize,
          total: allContracts?.meta?.pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ["10", "25", "50", "100"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} из ${total} всего`,
          onChange: handlerChange,
          align: "center",
        }}
        onChange={handlerChange}
      />

      {/* ─────────────── Модалка «Просмотр договора» ─────────────── */}
      <ModalViewContract
        isOpenModal={isOpenModal}
        closeModal={closeModal}
        docIdForModal={docIdForModal}
        update={handlerReload}
      />

      {/* ─────────────── Модалка «Добавление договора» ─────────────── */}
      <Modal
        title="Добавление нового договора"
        open={isOpenModalAddContract}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
      >
        <ModalAddContract
          isOpenModalAddContract={isOpenModalAddContract}
          closeModalAddContract={closeAddModal}
          update={handlerReload}
        />
      </Modal>

      {/* ─────────────── Drawer «Комментарии» ─────────────── */}
      <CommentDrawer
        open={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        contract={commentContract}
      />
    </>
  );
}

// import {
//   getAllContractors,
//   getAllContracts,
//   getAllPurposes,
// } from "../../lib/getData";
// import {
//   Table,
//   Space,
//   Flex,
//   Switch,
//   Button,
//   Modal,
//   Tag,
//   Select,
//   Tooltip,
//   Input,
//   Checkbox,
// } from "antd";
// import { debounce } from "lodash";
// import Text from "antd/es/typography/Text";
// import React, { useEffect, useState, useMemo } from "react";
// import ModalViewContract from "./ModalViewContract";
// import ModalAddContract from "./ModalAddContract";
// import CommentDrawer from "./CommentDrawer";
// import { ReloadOutlined } from "@ant-design/icons";
// import useAuth from "../../store/authStore";
// import { server } from "../../config";
// import dayjs from "dayjs";
// import axios from "axios";
// const defaultPageSize = 10;
// const defaultPage = 1;

// export default function TableContract() {
//   const { user } = useAuth((store) => store);
//   const [pagination, setPagination] = useState();
//   const [allContracts, setAllContracts] = useState();
//   const [allPurposes, setAllPurposes] = useState();
//   const [loading, setLoading] = useState(true);
//   const [isOpenModal, setIsOpenModal] = useState(false);
//   const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false);
//   const [docIdForModal, setDocIdForModal] = useState(null);
//   const [onlyAtWork, setOnlyAtWork] = useState(0);
//   const [listContractors, setListContractors] = useState(null);
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [selectedPurpose, setSelectedPurpose] = useState(null);
//   const [isCommentsOpen, setIsCommentsOpen] = useState(false);
//   const [commentContract, setCommentContract] = useState(null);
//   const [commentsCount, setCommentsCount] = useState({});

//   const [searchTask, setSearchTask] = useState("");
//   const debouncedTask = useMemo(
//     () => debounce((v) => setSearchTask(v.trim()), 500),
//     []
//   );
//   const [onlyZeroSteps, setOnlyZeroSteps] = useState(false);

//   const fetching = async (pageSize = defaultPageSize, page = defaultPage) => {
//     try {
//       setLoading(true);

//       // ─── ВСПОМОГАТ. ФУНКЦИЯ ────────────────────────────────────
//       const fetchChunk = (p) =>
//         getAllContracts(100, p, {
//           contractorId: selectedContractor,
//           completed: onlyAtWork,
//           purposeId: selectedPurpose,
//         });

//       let temp;

//       if (onlyZeroSteps || searchTask) {
//         // 1-я страница — узнаём, сколько всего
//         const first = await fetchChunk(1);
//         const pageCount = first.meta.pagination.pageCount;

//         // если страниц > 1 — тащим остальные параллельно
//         if (pageCount > 1) {
//           const rest = await Promise.all(
//             Array.from({ length: pageCount - 1 }, (_, i) => fetchChunk(i + 2))
//           );
//           first.data.push(...rest.flatMap((r) => r.data));
//         }
//         temp = first;
//       } else {
//         // обычный режим (постраничная загрузка)
//         temp = await getAllContracts(pageSize, page, {
//           contractorId: selectedContractor,
//           completed: onlyAtWork,
//           purposeId: selectedPurpose,
//         });
//       }

//       // ─── ФИЛЬТРЫ ------------------------------------------------
//       let filtered = temp.data;

//       if (searchTask) {
//         filtered = filtered.filter((c) =>
//           (c.numberTask || "").toLowerCase().includes(searchTask.toLowerCase())
//         );
//       }

//       if (onlyZeroSteps) {
//         filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
//       }

//       // ─── ПАТЧИМ METADATA, если фильтровали ----------------------
//       const patched =
//         searchTask || onlyZeroSteps
//           ? {
//               ...temp,
//               data: filtered,
//               meta: {
//                 ...temp.meta,
//                 pagination: {
//                   ...temp.meta.pagination,
//                   total: filtered.length,
//                   pageCount: Math.ceil(
//                     filtered.length / temp.meta.pagination.pageSize
//                   ),
//                 },
//               },
//             }
//           : temp;

//       setAllContracts(patched);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const fetching = async (pageSize = defaultPageSize, page = defaultPage) => {
//   //   try {
//   //     setLoading(true);

//   //     const temp = await getAllContracts(pageSize, page, {
//   //       contractorId: selectedContractor,
//   //       completed: onlyAtWork,
//   //       purposeId: selectedPurpose,
//   //     });

//   //     let filtered = searchTask
//   //       ? temp.data.filter((c) =>
//   //           (c.numberTask || "")
//   //             .toLowerCase()
//   //             .includes(searchTask.toLowerCase())
//   //         )
//   //       : temp.data;
//   //     if (onlyZeroSteps) {
//   //       filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
//   //     }

//   //     const patched =
//   //       searchTask || onlyZeroSteps
//   //         ? {
//   //             ...temp,
//   //             data: filtered,
//   //             meta: {
//   //               ...temp.meta,
//   //               pagination: {
//   //                 ...temp.meta.pagination,
//   //                 total: filtered.length,
//   //                 pageCount: Math.ceil(
//   //                   filtered.length / temp.meta.pagination.pageSize
//   //                 ),
//   //               },
//   //             },
//   //           }
//   //         : temp;

//   //     setAllContracts(patched);
//   //   } catch (e) {
//   //     console.error(e);
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   const fetchPurposes = async () => {
//     try {
//       const res = await getAllPurposes(100, 1);

//       let temp = res?.data
//         ?.sort((a, b) => {
//           const nameA = a.name.toLowerCase();
//           const nameB = b.name.toLowerCase();
//           if (nameA < nameB) return -1;
//           if (nameA > nameB) return 1;
//           return 0;
//         })
//         .map((item) => ({
//           value: item.id,
//           label: item.name,
//         }));
//       temp.unshift({
//         value: false,
//         label: "Все",
//       });
//       setAllPurposes(temp);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const fetchingContractors = async (defaultPageSize, defaultPage) => {
//     try {
//       const res = await getAllContractors(defaultPageSize, defaultPage);
//       let temp = res?.data
//         ?.sort((a, b) => {
//           const nameA = a.name.toLowerCase();
//           const nameB = b.name.toLowerCase();
//           if (nameA < nameB) return -1;
//           if (nameA > nameB) return 1;
//           return 0;
//         })
//         .map((item) => ({
//           value: item.id,
//           label: item.name,
//         }));
//       temp.unshift({
//         value: false,
//         label: "Все",
//       });
//       setListContractors(temp);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     fetching(
//       pagination?.pageSize || defaultPageSize,
//       pagination?.current || defaultPage
//     );
//     return () => debouncedTask.cancel();
//   }, [
//     selectedContractor,
//     onlyAtWork,
//     selectedPurpose,
//     searchTask,
//     onlyZeroSteps,
//   ]);

//   useEffect(() => {
//     fetchPurposes();
//     fetchingContractors(100, 1);
//   }, []);

//   useEffect(() => {
//     const fetchCommentsCount = async () => {
//       if (!allContracts?.data) return;

//       const counts = {};
//       const jwt = localStorage.getItem("jwt");

//       await Promise.all(
//         allContracts.data.map(async (contract) => {
//           try {
//             const res = await axios.get(
//               `${server}/api/comments?filters[contract][id][$eq]=${contract.id}`,
//               {
//                 headers: { Authorization: `Bearer ${jwt}` },
//               }
//             );
//             counts[contract.id] = res.data.meta?.pagination?.total || 0;
//           } catch (error) {
//             counts[contract.id] = 0;
//           }
//         })
//       );

//       setCommentsCount(counts);
//     };

//     fetchCommentsCount();
//   }, [allContracts]);

//   const columns = [
//     {
//       title: "Номер договора",
//       dataIndex: "number",
//       key: "number",
//       render: (text) => <span>{text}</span>,
//     },
//     {
//       title: "Дата договора",
//       dataIndex: "dateContract",
//       key: "dateContract",
//       render: (text) => <span>{dayjs(text).format("DD.MM.YYYY")}</span>,
//     },
//     {
//       title: "Предмет договора",
//       dataIndex: "description",
//       key: "description",
//     },
//     {
//       title: "Номер Тех.Задания",
//       dataIndex: "numberTask",
//       key: "numberTask",
//       render: (text) => <span>{text}</span>,
//     },
//     {
//       title: "Назначение",
//       dataIndex: "purpose",
//       key: "purpose",
//       render: (purpose) =>
//         purpose ? <Tag color={purpose.color}>{purpose.name}</Tag> : false,
//     },
//     {
//       title: "Количество выполненых этапов",
//       dataIndex: "stepsComplited",
//       key: "stepsComplited",
//       render: (text) => <span>{text}</span>,
//     },
//     {
//       title: "Подрядчик",
//       dataIndex: "contractor",
//       key: "contractor",
//       render: (text) => <span>{text}</span>,
//     },
//     {
//       title: "Статус",
//       dataIndex: "status",
//       key: "status",
//       render: (completed) =>
//         completed ? (
//           <Tag color={"volcano"}>Архивный</Tag>
//         ) : (
//           <Tag color={"green"}>В работе</Tag>
//         ),
//     },
//     {
//       title: "Действия",
//       key: "action",
//       render: (_, record) => (
//         <>
//           <Space size="middle">
//             <a onClick={() => openModal(record.documentId)}>Открыть договор</a>
//           </Space>
//           <Space size="middle">
//             <a
//               onClick={() => {
//                 setCommentContract(record);
//                 setIsCommentsOpen(true);
//               }}
//             >
//               Комментарии ({commentsCount[record.id] || 0})
//             </a>
//           </Space>
//         </>
//       ),
//     },

//     // {
//     //   title: "Действия",
//     //   key: "action",
//     //   render: (_, record) => (
//     //     <>
//     //       <Space size="middle">
//     //         <a onClick={() => openModal(record.documentId)}>Открыть договор</a>
//     //       </Space>
//     //       <Space size="middle">
//     //         <a
//     //           onClick={() => {
//     //             setCommentContract(record);
//     //             setIsCommentsOpen(true);
//     //           }}
//     //         >
//     //           Комментарии
//     //         </a>
//     //       </Space>
//     //     </>
//     //   ),
//     // },
//   ];

//   const data = allContracts?.data?.map((item) => ({
//     key: item.id,
//     id: item.id,
//     documentId: item.documentId,
//     number: item.number,
//     dateContract: item.dateContract,
//     description: item.description,
//     contractor: item.contractor?.name,
//     numberTask: item.numberTask,
//     status: item.completed,
//     purpose: item.purpose,
//     stepsComplited: item.steps?.length,
//     contractor_inn_kpp: `${item.contractor?.inn}/${item.contractor?.kpp}`,
//   }));

//   const handlerReload = async () => {
//     if (pagination) {
//       fetching(pagination.pageSize, pagination.current);
//     } else {
//       fetching(defaultPageSize, defaultPage);
//     }
//   };
//   const handlerChange = async (pagination) => {
//     // console.log("pagination", pagination);
//     setPagination(pagination);
//     fetching(pagination.pageSize, pagination.current);
//   };
//   const handlerAddNewContract = async () => {
//     // console.log('Добавить новый объект');
//     setIsOpenModalAddContract(true);
//   };
//   const openModal = async (documentId) => {
//     setDocIdForModal(documentId);
//     setIsOpenModal(true);
//   };
//   const closeModal = async () => {
//     setDocIdForModal(null);
//     setIsOpenModal(false);
//   };
//   const closeModalAddContract = async () => {
//     setIsOpenModalAddContract(false);
//   };

//   return (
//     <div>
//       <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
//         <Flex gap={20} align="center">
//           <Flex gap={10} align="center">
//             <Text>Статус:</Text>
//             <Select
//               defaultValue={0}
//               options={[
//                 {
//                   value: 0,
//                   label: "Все",
//                 },
//                 {
//                   value: 1,
//                   label: "В работе",
//                 },
//                 {
//                   value: 2,
//                   label: "Архивный",
//                 },
//               ]}
//               style={{ width: 150 }}
//               onChange={(value) => {
//                 setOnlyAtWork(value);
//               }}
//             />
//           </Flex>
//           <Flex gap={10} align="center">
//             <Text>Назначение:</Text>
//             {allPurposes && (
//               <Select
//                 defaultValue="Все"
//                 style={{ width: 150 }}
//                 onChange={(value) => {
//                   setSelectedPurpose(value);
//                 }}
//                 options={allPurposes}
//               />
//             )}
//           </Flex>

//           <Input
//             placeholder="Поиск по № Тех.-задания"
//             allowClear
//             style={{ width: 215 }}
//             onChange={(e) => debouncedTask(e.target.value)}
//           />

//           <Checkbox
//             checked={onlyZeroSteps}
//             onChange={(e) => setOnlyZeroSteps(e.target.checked)}
//           >
//             0&nbsp;этапов
//           </Checkbox>

//           <Flex gap={10} align="center">
//             <Text>Подрядчик:</Text>
//             {listContractors && (
//               <Select
//                 defaultValue="Все"
//                 style={{ width: 300 }}
//                 onChange={(value) => {
//                   setSelectedContractor(value);
//                 }}
//                 options={listContractors}
//                 showSearch={true}
//                 optionFilterProp="label"
//               />
//             )}
//           </Flex>
//         </Flex>
//         <Flex gap={20} align="center">
//           <Tooltip title="Обновить">
//             <a onClick={handlerReload}>
//               <ReloadOutlined />
//             </a>
//           </Tooltip>
//           {user?.role?.type !== "readadmin" && (
//             <Button onClick={handlerAddNewContract} type="primary">
//               Добавить новый договор
//             </Button>
//           )}
//         </Flex>
//       </Flex>
//       <Table
//         columns={columns}
//         dataSource={data}
//         pagination={{
//           pageSizeOptions: [10, 25, 50, 100],
//           showSizeChanger: {
//             options: [
//               {
//                 value: defaultPageSize,
//                 label: defaultPageSize + " / на странице",
//               },
//               { value: 25, label: 25 + " / на странице" },
//               { value: 50, label: 50 + " / на странице" },
//               { value: 100, label: 100 + " / на странице" },
//             ],
//           },
//           defaultPageSize: defaultPageSize,
//           defaultCurrent: defaultPage,
//           showTotal: (total, range) =>
//             `${range[0]}-${range[1]} из ${total} всего`,
//           total:
//             allContracts?.data?.length > 0
//               ? allContracts.meta.pagination.total
//               : 0,
//           align: "center",
//         }}
//         onChange={handlerChange}
//         loading={loading}
//       />
//       <ModalViewContract
//         isOpenModal={isOpenModal}
//         closeModal={closeModal}
//         docIdForModal={docIdForModal}
//         update={handlerReload}
//       />
//       <Modal
//         title="Добавление нового договора"
//         open={isOpenModalAddContract}
//         onCancel={closeModalAddContract}
//         footer={false}
//       >
//         <ModalAddContract
//           isOpenModalAddContract={isOpenModalAddContract}
//           closeModalAddContract={closeModalAddContract}
//           update={handlerReload}
//         />
//       </Modal>

//       <CommentDrawer
//         open={isCommentsOpen}
//         onClose={() => setIsCommentsOpen(false)}
//         contract={commentContract}
//       />
//     </div>
//   );
// }
