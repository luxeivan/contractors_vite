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
  Badge,
} from "antd";
import { debounce } from "lodash";
import React, { useEffect, useState, useMemo } from "react";
import { CommentOutlined, ReloadOutlined } from "@ant-design/icons";
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

  // фильтры
  const [onlyAtWork, setOnlyAtWork] = useState(0);
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [searchTask, setSearchTask] = useState("");
  const [stepsFilter, setStepsFilter] = useState(null);

  const debouncedTask = useMemo(
    () => debounce((v) => setSearchTask(v.trim()), 500),
    []
  );

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

      if (searchTask) {
        filtered = filtered.filter((c) =>
          (c.numberTask || "").toLowerCase().includes(searchTask.toLowerCase())
        );
      }

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
      render: (text, record) => <a onClick={() => openModal(record.documentId)}>{text}</a>,
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
      title: " ",
      key: "action",
      render: (_, record) => {
        // console.log(record);

        return (
          <>
            {/* <Space size="middle">
            <a onClick={() => openModal(record.documentId)}>Открыть договор</a>
          </Space> */}
            <Flex size="middle" justify="center">
              <a
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setCommentContract(record);
                  setIsCommentsOpen(true);
                }}
              >
                {/* <Badge count={commentsCount[record.id]}>
                  <CommentOutlined style={{
                    fontSize: 24,
                    color: "#1677ff"
                  }} />
                </Badge> */}
              </a>
            </Flex>
          </>
        )
      },
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
      <Flex justify="space-between" wrap={"wrap"} gap={10} style={{ marginBottom: 12 }}>

        <Flex wrap={"wrap"} gap={10}>
          <Flex wrap={"wrap"} gap={10} vertical>
            <Flex wrap={"wrap"} gap={10}>
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
            </Flex>
            <Flex wrap={"wrap"} gap={10}>
              {/* «Подрядчик»  */}
              <Flex style={{ flex: 1, }} align="center">
                <Text style={{ marginRight: 8 }}>Подрядчик:</Text>
                <Select
                  value={selectedContractor}
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 1 }}
                  placeholder="Выберите подрядчика"
                  onChange={(val) => setSelectedContractor(val)}
                  options={listContractors}
                />
              </Flex>

            </Flex>
          </Flex>
          <Flex wrap={"wrap"} gap={10} vertical>
            {/* Наличие этапов */}
            <Space align="center">
              <Text>Наличие этапов:</Text>
              <Select
                value={stepsFilter}
                style={{ width: 140 }}
                onChange={(val) => setStepsFilter(val)}
                options={[
                  { value: null, label: "Все" },
                  { value: "nonzero", label: "Есть" },
                  { value: "zero", label: "Нет" },
                ]}
              />
            </Space>
            {/* «Поиск по № Тех.Задания» */}
            <Flex style={{ flex: 1, }} align="center">
              <Input
                placeholder="Поиск по № Тех.Задания"
                allowClear
                // style={{ width: 209 }}
                onChange={(e) => debouncedTask(e.target.value)}
              />
            </Flex>
          </Flex>
        </Flex>
        <div>
          <Flex wrap={"wrap"} gap={20} align="center">
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
          </Flex>
        </div>
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
        onRow={(record, rowIndex) => {
          return {
            onClick: (event) => {
              // console.log("onClick", event);
              openModal(record.documentId)
            }, // click row
          };
        }}
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
      {/* <CommentDrawer
        open={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        contract={commentContract}
      /> */}
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
//   Button,
//   Tag,
//   Select,
//   Tooltip,
//   Input,
//   Modal,
//   Typography,
// } from "antd";
// import { debounce } from "lodash";
// import React, { useEffect, useState, useMemo } from "react";
// import { ReloadOutlined } from "@ant-design/icons";
// import dayjs from "dayjs";
// import axios from "axios";
// import useAuth from "../../store/authStore";
// import { server } from "../../config";

// import ModalViewContract from "./ModalViewContract";
// import ModalAddContract from "./ModalAddContract";
// import CommentDrawer from "./CommentDrawer";

// const { Text } = Typography;

// const defaultPageSize = 10;
// const defaultPage = 1;

// export default function TableContract() {
//   const { user } = useAuth((store) => store);

//   // ─────────────── state ───────────────
//   const [pagination, setPagination] = useState();
//   const [allContracts, setAllContracts] = useState();
//   const [allPurposes, setAllPurposes] = useState([]);
//   const [listContractors, setListContractors] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // модалки / drawer
//   const [isOpenModal, setIsOpenModal] = useState(false);
//   const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false);
//   const [docIdForModal, setDocIdForModal] = useState(null);
//   const [isCommentsOpen, setIsCommentsOpen] = useState(false);
//   const [commentContract, setCommentContract] = useState(null);
//   const [commentsCount, setCommentsCount] = useState({});

//   const [onlyAtWork, setOnlyAtWork] = useState(0);
//   const [selectedPurpose, setSelectedPurpose] = useState(null);
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [searchTask, setSearchTask] = useState("");
//   const [stepsFilter, setStepsFilter] = useState(null);
//   const debouncedTask = useMemo(
//     () => debounce((v) => setSearchTask(v.trim()), 500),
//     []
//   );

//   // 1) Загрузить список назначений (purpose)
//   const fetchPurposes = async () => {
//     try {
//       const res = await getAllPurposes(100, 1);
//       const temp = res.data
//         .sort((a, b) => a.name.localeCompare(b.name))
//         .map((item) => ({
//           value: item.id,
//           label: item.name,
//         }));
//       temp.unshift({ value: null, label: "Все" });
//       setAllPurposes(temp);
//     } catch (error) {
//       console.error("fetchPurposes error:", error);
//     }
//   };

//   // 2) Загрузить список подрядчиков (contractor)
//   const fetchContractors = async () => {
//     try {
//       const res = await getAllContractors(1000, 1);
//       const temp = res.data
//         .sort((a, b) => a.name.localeCompare(b.name))
//         .map((item) => ({
//           value: item.id,
//           label: item.name,
//         }));
//       temp.unshift({ value: null, label: "Все" });
//       setListContractors(temp);
//     } catch (error) {
//       console.error("fetchContractors error:", error);
//     }
//   };

//   const fetchContracts = async (
//     pageSize = defaultPageSize,
//     page = defaultPage
//   ) => {
//     try {
//       setLoading(true);

//       const fetchChunk = (p) =>
//         getAllContracts(100, p, {
//           contractorId: selectedContractor || undefined,
//           completed: onlyAtWork,
//           purposeId: selectedPurpose || undefined,
//         });

//       let tempResp;

//       if (searchTask || stepsFilter !== null) {
//         const first = await fetchChunk(1);
//         const pageCount = first.meta.pagination.pageCount;

//         if (pageCount > 1) {
//           const rest = await Promise.all(
//             Array.from({ length: pageCount - 1 }, (_, i) => fetchChunk(i + 2))
//           );
//           first.data.push(...rest.flatMap((r) => r.data));
//         }
//         tempResp = first;
//       } else {
//         tempResp = await getAllContracts(pageSize, page, {
//           contractorId: selectedContractor || undefined,
//           completed: onlyAtWork,
//           purposeId: selectedPurpose || undefined,
//         });
//       }

//       let filtered = tempResp.data;

//       // 3.1. Поиск по номеру ТЗ
//       if (searchTask) {
//         filtered = filtered.filter((c) =>
//           (c.numberTask || "").toLowerCase().includes(searchTask.toLowerCase())
//         );
//       }

//       // 3.2. Фильтр «Наличие этапов»
//       if (stepsFilter === "zero") {
//         filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
//       } else if (stepsFilter === "nonzero") {
//         filtered = filtered.filter((c) => (c.steps?.length || 0) > 0);
//       }

//       const patched =
//         searchTask || stepsFilter !== null
//           ? {
//               ...tempResp,
//               data: filtered,
//               meta: {
//                 ...tempResp.meta,
//                 pagination: {
//                   ...tempResp.meta.pagination,
//                   total: filtered.length,
//                   pageCount: Math.ceil(
//                     filtered.length / tempResp.meta.pagination.pageSize
//                   ),
//                 },
//               },
//             }
//           : tempResp;

//       setAllContracts(patched);
//     } catch (e) {
//       console.error("fetchContracts error:", e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 4) Считаем количество комментариев для каждой записи
//   useEffect(() => {
//     if (!allContracts?.data) return;

//     const fetchCommentsCount = async () => {
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
//           } catch {
//             counts[contract.id] = 0;
//           }
//         })
//       );

//       setCommentsCount(counts);
//     };

//     fetchCommentsCount();
//   }, [allContracts]);

//   // ─────────────── эффекты загрузки ───────────────

//   // При изменении фильтров (contractor, status, purpose, searchTask, stepsFilter)
//   useEffect(() => {
//     fetchContracts(
//       pagination?.pageSize || defaultPageSize,
//       pagination?.current || defaultPage
//     );
//     return () => debouncedTask.cancel();
//   }, [
//     selectedContractor,
//     onlyAtWork,
//     selectedPurpose,
//     searchTask,
//     stepsFilter,
//   ]);

//   // При первом рендере – загрузить списки «Назначения» и «Подрядчики»
//   useEffect(() => {
//     fetchPurposes();
//     fetchContractors();
//   }, []);

//   // ─────────────── колонки таблицы ───────────────
//   const columns = [
//     {
//       title: "Номер договора",
//       dataIndex: "number",
//       key: "number",
//     },
//     {
//       title: "Дата договора",
//       dataIndex: "dateContract",
//       key: "dateContract",
//       render: (d) => <span>{dayjs(d).format("DD.MM.YYYY")}</span>,
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
//     },
//     {
//       title: "Назначение",
//       dataIndex: "purpose",
//       key: "purpose",
//       render: (p) => (p ? <Tag color={p.color}>{p.name}</Tag> : "-"),
//     },
//     {
//       title: "Кол-во выполненных этапов",
//       dataIndex: "stepsComplited",
//       key: "stepsComplited",
//     },
//     {
//       title: "Подрядчик",
//       dataIndex: "contractor",
//       key: "contractor",
//     },
//     {
//       title: "Статус",
//       dataIndex: "status",
//       key: "status",
//       render: (completed) =>
//         completed ? (
//           <Tag color="volcano">Архивный</Tag>
//         ) : (
//           <Tag color="green">В работе</Tag>
//         ),
//     },
//   ];

//   if (user?.role?.type !== "readadmin") {
//     columns.push({
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
//               Комментарии
//             </a>
//           </Space>
//         </>
//       ),
//     });
//   }

//   // ─────────────── подготовка данных для таблицы ───────────────
//   const data = allContracts?.data?.map((item) => ({
//     key: item.id,
//     id: item.id,
//     documentId: item.documentId,
//     number: item.number,
//     dateContract: item.dateContract,
//     description: item.description,
//     contractor: item.contractor?.name || "-",
//     numberTask: item.numberTask,
//     purpose: item.purpose,
//     stepsComplited: item.steps?.length || 0,
//     status: item.completed,
//   }));

//   // ─────────────── обработчики ───────────────
//   const handlerReload = () => {
//     // сбросим все фильтры и перезагрузим первую страницу
//     setSelectedContractor(null);
//     setOnlyAtWork(0);
//     setSelectedPurpose(null);
//     setSearchTask("");
//     setStepsFilter(null);
//     fetchContracts(defaultPageSize, defaultPage);
//   };

//   const handlerChange = (pag) => {
//     setPagination(pag);
//     fetchContracts(pag.pageSize, pag.current);
//   };

//   const handlerAddNewContract = () => {
//     setIsOpenModalAddContract(true);
//   };

//   const openModal = (docId) => {
//     setDocIdForModal(docId);
//     setIsOpenModal(true);
//   };

//   const closeModal = () => {
//     setDocIdForModal(null);
//     setIsOpenModal(false);
//   };

//   const closeAddModal = () => {
//     setIsOpenModalAddContract(false);
//   };

//   // ─────────────── JSX ───────────────
//   return (
//     <>
//       {/* ─────────────── ФИЛЬТРЫ (две строки) ─────────────── */}
//       {/* Первая строка фильтров */}
//       <Flex justify="space-between" align="middle" style={{ marginBottom: 12 }}>
//         <Space size="middle" align="center">
//           {/* Статус */}
//           <Space align="center">
//             <Text>Статус:</Text>
//             <Select
//               value={onlyAtWork}
//               style={{ width: 140 }}
//               onChange={(val) => setOnlyAtWork(val)}
//               options={[
//                 { value: 0, label: "Все" },
//                 { value: 1, label: "В работе" },
//                 { value: 2, label: "Архивный" },
//               ]}
//             />
//           </Space>

//           {/* Назначение */}
//           <Space align="center">
//             <Text>Назначение:</Text>
//             <Select
//               value={selectedPurpose}
//               style={{ width: 180 }}
//               onChange={(val) => setSelectedPurpose(val)}
//               options={allPurposes}
//             />
//           </Space>

//           {/* Поиск по № Тех.Задания */}
//           <Input
//             placeholder="Поиск по № Тех.Задания"
//             allowClear
//             style={{ width: 220 }}
//             onChange={(e) => debouncedTask(e.target.value)}
//           />
//         </Space>

//         <Space size="middle" align="center">
//           <Tooltip title="Сброс фильтров">
//             <a onClick={handlerReload}>
//               <ReloadOutlined style={{ fontSize: 18 }} />
//             </a>
//           </Tooltip>
//           {user?.role?.type !== "readadmin" && (
//             <Button type="primary" onClick={handlerAddNewContract}>
//               Добавить новый договор
//             </Button>
//           )}
//         </Space>
//       </Flex>

//       {/* Вторая строка фильтров */}
//       <Flex justify="flex-start" align="middle" style={{ marginBottom: 20 }}>
//         <Space size="middle" align="center">
//           {/* Наличие этапов */}
//           <Space align="center">
//             <Text>Наличие этапов:</Text>
//             <Select
//               value={stepsFilter}
//               style={{ width: 160 }}
//               onChange={(val) => setStepsFilter(val)}
//               options={[
//                 { value: null, label: "Все" },
//                 { value: "zero", label: "0 этапов" },
//                 { value: "nonzero", label: "> 0 этапов" },
//               ]}
//             />
//           </Space>

//           {/* Подрядчик */}
//           <Space align="center">
//             <Text>Подрядчик:</Text>
//             <Select
//               value={selectedContractor}
//               showSearch
//               optionFilterProp="label"
//               style={{ width: 260 }}
//               placeholder="Выберите подрядчика"
//               onChange={(val) => setSelectedContractor(val)}
//               options={listContractors}
//             />
//           </Space>
//         </Space>
//       </Flex>

//       {/* ─────────────── Таблица ─────────────── */}
//       <Table
//         columns={columns}
//         dataSource={data}
//         loading={loading}
//         style={{ width: "100%" }}
//         pagination={{
//           current: pagination?.current || defaultPage,
//           pageSize: pagination?.pageSize || defaultPageSize,
//           total: allContracts?.meta?.pagination?.total || 0,
//           showSizeChanger: true,
//           pageSizeOptions: ["10", "25", "50", "100"],
//           showTotal: (total, range) =>
//             `${range[0]}-${range[1]} из ${total} всего`,
//           onChange: handlerChange,
//           align: "center",
//         }}
//         onChange={handlerChange}
//       />

//       {/* ─────────────── Модалка «Просмотр договора» ─────────────── */}
//       <ModalViewContract
//         isOpenModal={isOpenModal}
//         closeModal={closeModal}
//         docIdForModal={docIdForModal}
//         update={handlerReload}
//       />

//       {/* ─────────────── Модалка «Добавление договора» ─────────────── */}
//       <Modal
//         title="Добавление нового договора"
//         open={isOpenModalAddContract}
//         onCancel={closeAddModal}
//         footer={null}
//         destroyOnClose
//       >
//         <ModalAddContract
//           isOpenModalAddContract={isOpenModalAddContract}
//           closeModalAddContract={closeAddModal}
//           update={handlerReload}
//         />
//       </Modal>

//       {/* ─────────────── Drawer «Комментарии» ─────────────── */}
//       <CommentDrawer
//         open={isCommentsOpen}
//         onClose={() => setIsCommentsOpen(false)}
//         contract={commentContract}
//       />
//     </>
//   );
// }
