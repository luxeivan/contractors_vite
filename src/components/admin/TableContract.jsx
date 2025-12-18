import {
  getAllContractors,
  getAllContracts,
  getAllPurposes,
  getAllFilials,
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
import useAuth from "../../store/authStore";

import ModalViewContract from "./ModalViewContract";
import ModalAddContract from "./ModalAddContract";

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
  const [onlyAtWork, setOnlyAtWork] = useState(1);
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  // const [selectedFilials, setSelectedFilials] = useState(null);
  const [allFilials, setFilials] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState(null);
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

  const fetchFilials = async () => {
    try {
      const res = await getAllFilials(100, 1);
      const temp = res.data
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      temp.unshift({ value: null, label: "Все" });
      setFilials(temp);
    } catch (error) {
      console.error("fetchFilials error:", error);
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
          filialId: selectedFilial || undefined,
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
        // Теперь здесь filialId передается на бэкенд
        tempResp = await getAllContracts(pageSize, page, {
          contractorId: selectedContractor || undefined,
          completed: onlyAtWork,
          purposeId: selectedPurpose || undefined,
          filialId: selectedFilial || undefined, // ← И ЗДЕСЬ ТОЖЕ
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

      // УБИРАЕМ фильтрацию по филиалу на клиенте, т.к. она теперь на сервере
      // if (selectedFilial !== null) {
      //   filtered = filtered.filter(
      //     (c) =>
      //       c.filial &&
      //       (c.filial.id === selectedFilial ||
      //         c.filial?.documentId === selectedFilial)
      //   );
      // }

      const isClientFiltering = !!searchTask || stepsFilter !== null;

      if (isClientFiltering) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageData = filtered.slice(start, end);

        const patched = {
          ...tempResp,
          data: pageData,
          meta: {
            ...tempResp.meta,
            pagination: {
              ...tempResp.meta.pagination,
              page,
              pageSize,
              total: filtered.length,
              pageCount: Math.ceil(filtered.length / pageSize),
            },
          },
        };

        setAllContracts(patched);
      } else {
        setAllContracts(tempResp);
      }
    } catch (e) {
      console.error("fetchContracts error:", e);
    } finally {
      setLoading(false);
    }
  };

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
    selectedFilial, 
    searchTask,
    stepsFilter,
  ]);

  useEffect(() => {
    fetchPurposes();
    fetchFilials();
    fetchContractors();
  }, []);

  // ─────────────── колонки таблицы ───────────────
  const columns = [
    {
      title: "Номер договора",
      dataIndex: "number",
      key: "number",
      render: (text, record) => (
        <a onClick={() => openModal(record.documentId)}>{text}</a>
      ),
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
            <Flex size="middle" justify="center">
              <a
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCommentContract(record);
                  setIsCommentsOpen(true);
                }}
              ></a>
            </Flex>
          </>
        );
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
    const pageSize = pagination?.pageSize || defaultPageSize;

    setSelectedContractor(null);
    setOnlyAtWork(1);
    setSelectedPurpose(null);
    setSelectedFilial(null);
    setSearchTask("");
    setStepsFilter(null);

    setPagination((prev) => ({
      ...(prev || {}),
      current: defaultPage,
      pageSize,
    }));

    fetchContracts(pageSize, defaultPage);
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
      <Flex
        justify="space-between"
        wrap={"wrap"}
        gap={10}
        style={{ marginBottom: 12 }}
      >
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
              {/* Наличие этапов */}
              <Space align="center">
                <Text>Наличие отчётов:</Text>
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
              {/* Филиал */}
              <Space align="center">
                <Text>Филиал:</Text>
                <Select
                  value={selectedFilial}
                  style={{ width: 180 }}
                  allowClear
                  onChange={(val) => setSelectedFilial(val)}
                  options={allFilials}
                />
              </Space>
            </Flex>
            <Flex wrap={"wrap"} gap={10}>
              {/* «Подрядчик»  */}
              <Flex style={{ flex: 1 }} align="center">
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
              {/* Поиск по № Тех.Задания */}
              <Flex style={{ flex: 1 }} align="center">
                <Input
                  placeholder="Поиск по № Тех.Задания"
                  allowClear
                  onChange={(e) => debouncedTask(e.target.value)}
                />
              </Flex>
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
        rowClassName={() => "hoverable-row"}
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
              openModal(record.documentId);
            },
            style: {
              cursor: "pointer",
            },
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
    </>
  );
}

// import {
//   getAllContractors,
//   getAllContracts,
//   getAllPurposes,
//   getAllFilials,
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
// import useAuth from "../../store/authStore";

// import ModalViewContract from "./ModalViewContract";
// import ModalAddContract from "./ModalAddContract";

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

//   // фильтры
//   const [onlyAtWork, setOnlyAtWork] = useState(1);
//   const [selectedPurpose, setSelectedPurpose] = useState(null);
//   const [allFilials, setFilials] = useState([]);
//   const [selectedFilial, setSelectedFilial] = useState(null);
//   const [selectedContractor, setSelectedContractor] = useState(null);
//   const [searchTask, setSearchTask] = useState("");
//   const [stepsFilter, setStepsFilter] = useState(null);

//   const debouncedTask = useMemo(
//     () => debounce((v) => setSearchTask(v.trim()), 500),
//     []
//   );

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

//   const fetchFilials = async () => {
//     try {
//       const res = await getAllFilials(100, 1);
//       const temp = res.data
//         .sort((a, b) => a.name.localeCompare(b.name))
//         .map((item) => ({
//           value: item.id,
//           label: item.name,
//         }));
//       temp.unshift({ value: null, label: "Все" });
//       setFilials(temp);
//     } catch (error) {
//       console.error("fetchFilials error:", error);
//     }
//   };

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

//       if (searchTask || stepsFilter !== null || selectedFilial !== null) {
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

//       if (searchTask) {
//         filtered = filtered.filter((c) =>
//           (c.numberTask || "").toLowerCase().includes(searchTask.toLowerCase())
//         );
//       }

//       if (stepsFilter === "zero") {
//         filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
//       } else if (stepsFilter === "nonzero") {
//         filtered = filtered.filter((c) => (c.steps?.length || 0) > 0);
//       }

//       if (selectedFilial !== null) {
//         filtered = filtered.filter(
//           (c) =>
//             c.filial &&
//             (c.filial.id === selectedFilial ||
//               c.filial?.documentId === selectedFilial)
//         );
//       }

//       const isClientFiltering =
//         !!searchTask || stepsFilter !== null || selectedFilial !== null;

//       if (isClientFiltering) {
//         const start = (page - 1) * pageSize;
//         const end = start + pageSize;
//         const pageData = filtered.slice(start, end);

//         const patched = {
//           ...tempResp,
//           data: pageData,
//           meta: {
//             ...tempResp.meta,
//             pagination: {
//               ...tempResp.meta.pagination,
//               page,
//               pageSize,
//               total: filtered.length,
//               pageCount: Math.ceil(filtered.length / pageSize),
//             },
//           },
//         };

//         setAllContracts(patched);
//       } else {
//         setAllContracts(tempResp);
//       }
//     } catch (e) {
//       console.error("fetchContracts error:", e);
//     } finally {
//       setLoading(false);
//     }
//   };

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
//     selectedFilial,
//     searchTask,
//     stepsFilter,
//   ]);

//   useEffect(() => {
//     fetchPurposes();
//     fetchFilials();
//     fetchContractors();
//   }, []);

//   // ─────────────── колонки таблицы ───────────────
//   const columns = [
//     {
//       title: "Номер договора",
//       dataIndex: "number",
//       key: "number",
//       render: (text, record) => (
//         <a onClick={() => openModal(record.documentId)}>{text}</a>
//       ),
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
//       title: " ",
//       key: "action",
//       render: (_, record) => {
//         // console.log(record);

//         return (
//           <>
//             <Flex size="middle" justify="center">
//               <a
//                 onClick={(event) => {
//                   event.preventDefault();
//                   event.stopPropagation();
//                   setCommentContract(record);
//                   setIsCommentsOpen(true);
//                 }}
//               ></a>
//             </Flex>
//           </>
//         );
//       },
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
//     const pageSize = pagination?.pageSize || defaultPageSize;

//     setSelectedContractor(null);
//     setOnlyAtWork(1);
//     setSelectedPurpose(null);
//     setSelectedFilial(null);
//     setSearchTask("");
//     setStepsFilter(null);

//     setPagination((prev) => ({
//       ...(prev || {}),
//       current: defaultPage,
//       pageSize,
//     }));

//     fetchContracts(pageSize, defaultPage);
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
//       <Flex
//         justify="space-between"
//         wrap={"wrap"}
//         gap={10}
//         style={{ marginBottom: 12 }}
//       >
//         <Flex wrap={"wrap"} gap={10}>
//           <Flex wrap={"wrap"} gap={10} vertical>
//             <Flex wrap={"wrap"} gap={10}>
//               {/* Статус */}
//               <Space align="center">
//                 <Text>Статус:</Text>
//                 <Select
//                   value={onlyAtWork}
//                   style={{ width: 140 }}
//                   onChange={(val) => setOnlyAtWork(val)}
//                   options={[
//                     { value: 0, label: "Все" },
//                     { value: 1, label: "В работе" },
//                     { value: 2, label: "Архивный" },
//                   ]}
//                 />
//               </Space>
//               {/* Назначение */}
//               <Space align="center">
//                 <Text>Назначение:</Text>
//                 <Select
//                   value={selectedPurpose}
//                   style={{ width: 180 }}
//                   onChange={(val) => setSelectedPurpose(val)}
//                   options={allPurposes}
//                 />
//               </Space>
//               {/* Наличие этапов */}
//               <Space align="center">
//                 <Text>Наличие отчётов:</Text>
//                 <Select
//                   value={stepsFilter}
//                   style={{ width: 140 }}
//                   onChange={(val) => setStepsFilter(val)}
//                   options={[
//                     { value: null, label: "Все" },
//                     { value: "nonzero", label: "Есть" },
//                     { value: "zero", label: "Нет" },
//                   ]}
//                 />
//               </Space>
//               {/* Филиал */}
//               <Space align="center">
//                 <Text>Филиал:</Text>
//                 <Select
//                   value={selectedFilial}
//                   style={{ width: 180 }}
//                   allowClear
//                   placeholder="Все"
//                   onChange={(val) => setSelectedFilial(val ?? null)}
//                   options={allFilials}
//                 />
//               </Space>
//             </Flex>
//             <Flex wrap={"wrap"} gap={10}>
//               {/* «Подрядчик»  */}
//               <Flex style={{ flex: 1 }} align="center">
//                 <Text style={{ marginRight: 8 }}>Подрядчик:</Text>
//                 <Select
//                   value={selectedContractor}
//                   showSearch
//                   optionFilterProp="label"
//                   style={{ flex: 1 }}
//                   placeholder="Выберите подрядчика"
//                   onChange={(val) => setSelectedContractor(val)}
//                   options={listContractors}
//                 />
//               </Flex>
//               {/* Поиск по № Тех.Задания */}
//               <Flex style={{ flex: 1 }} align="center">
//                 <Input
//                   placeholder="Поиск по № Тех.Задания"
//                   allowClear
//                   onChange={(e) => debouncedTask(e.target.value)}
//                 />
//               </Flex>
//             </Flex>
//           </Flex>
//         </Flex>
//         <div>
//           <Flex wrap={"wrap"} gap={20} align="center">
//             <Tooltip title="Сброс фильтров">
//               <a onClick={handlerReload}>
//                 <ReloadOutlined style={{ fontSize: 18 }} />
//               </a>
//             </Tooltip>
//             {user?.role?.type !== "readadmin" && (
//               <Button type="primary" onClick={handlerAddNewContract}>
//                 Добавить новый договор
//               </Button>
//             )}
//           </Flex>
//         </div>
//       </Flex>
//       {/* ─────────────── Таблица ─────────────── */}
//       <Table
//         rowClassName={() => "hoverable-row"}
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
//         onRow={(record, rowIndex) => {
//           return {
//             onClick: (event) => {
//               openModal(record.documentId);
//             },
//             style: {
//               cursor: "pointer",
//             },
//           };
//         }}
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
//     </>
//   );
// }
