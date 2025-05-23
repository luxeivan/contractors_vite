import {
  getAllContractors,
  getAllContracts,
  getAllPurposes,
} from "../../lib/getData";
import {
  Table,
  Space,
  Flex,
  Switch,
  Button,
  Modal,
  Tag,
  Select,
  Tooltip,
  Input,
  Checkbox,
} from "antd";
import { debounce } from "lodash";
import Text from "antd/es/typography/Text";
import React, { useEffect, useState, useMemo } from "react";
import ModalViewContract from "./ModalViewContract";
import ModalAddContract from "./ModalAddContract";
import CommentDrawer from "./CommentDrawer";
import { ReloadOutlined } from "@ant-design/icons";
import useAuth from "../../store/authStore";
import { server } from "../../config";
import dayjs from "dayjs";
import axios from "axios";
const defaultPageSize = 10;
const defaultPage = 1;

export default function TableContract() {
  const { user } = useAuth((store) => store);
  const [pagination, setPagination] = useState();
  const [allContracts, setAllContracts] = useState();
  const [allPurposes, setAllPurposes] = useState();
  const [loading, setLoading] = useState(true);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false);
  const [docIdForModal, setDocIdForModal] = useState(null);
  const [onlyAtWork, setOnlyAtWork] = useState(0);
  const [listContractors, setListContractors] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentContract, setCommentContract] = useState(null);
  const [commentsCount, setCommentsCount] = useState({});

  const [searchTask, setSearchTask] = useState("");
  const debouncedTask = useMemo(
    () => debounce((v) => setSearchTask(v.trim()), 500),
    []
  );
  const [onlyZeroSteps, setOnlyZeroSteps] = useState(false);

  const fetching = async (pageSize = defaultPageSize, page = defaultPage) => {
    try {
      setLoading(true);

      // ─── ВСПОМОГАТ. ФУНКЦИЯ ────────────────────────────────────
      const fetchChunk = (p) =>
        getAllContracts(100, p, {
          contractorId: selectedContractor,
          completed: onlyAtWork,
          purposeId: selectedPurpose,
        });

      let temp;

      if (onlyZeroSteps || searchTask) {
        // 1-я страница — узнаём, сколько всего
        const first = await fetchChunk(1);
        const pageCount = first.meta.pagination.pageCount;

        // если страниц > 1 — тащим остальные параллельно
        if (pageCount > 1) {
          const rest = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, i) => fetchChunk(i + 2))
          );
          first.data.push(...rest.flatMap((r) => r.data));
        }
        temp = first;
      } else {
        // обычный режим (постраничная загрузка)
        temp = await getAllContracts(pageSize, page, {
          contractorId: selectedContractor,
          completed: onlyAtWork,
          purposeId: selectedPurpose,
        });
      }

      // ─── ФИЛЬТРЫ ------------------------------------------------
      let filtered = temp.data;

      if (searchTask) {
        filtered = filtered.filter((c) =>
          (c.numberTask || "").toLowerCase().includes(searchTask.toLowerCase())
        );
      }

      if (onlyZeroSteps) {
        filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
      }

      // ─── ПАТЧИМ METADATA, если фильтровали ----------------------
      const patched =
        searchTask || onlyZeroSteps
          ? {
              ...temp,
              data: filtered,
              meta: {
                ...temp.meta,
                pagination: {
                  ...temp.meta.pagination,
                  total: filtered.length,
                  pageCount: Math.ceil(
                    filtered.length / temp.meta.pagination.pageSize
                  ),
                },
              },
            }
          : temp;

      setAllContracts(patched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // const fetching = async (pageSize = defaultPageSize, page = defaultPage) => {
  //   try {
  //     setLoading(true);

  //     const temp = await getAllContracts(pageSize, page, {
  //       contractorId: selectedContractor,
  //       completed: onlyAtWork,
  //       purposeId: selectedPurpose,
  //     });

  //     let filtered = searchTask
  //       ? temp.data.filter((c) =>
  //           (c.numberTask || "")
  //             .toLowerCase()
  //             .includes(searchTask.toLowerCase())
  //         )
  //       : temp.data;
  //     if (onlyZeroSteps) {
  //       filtered = filtered.filter((c) => (c.steps?.length || 0) === 0);
  //     }

  //     const patched =
  //       searchTask || onlyZeroSteps
  //         ? {
  //             ...temp,
  //             data: filtered,
  //             meta: {
  //               ...temp.meta,
  //               pagination: {
  //                 ...temp.meta.pagination,
  //                 total: filtered.length,
  //                 pageCount: Math.ceil(
  //                   filtered.length / temp.meta.pagination.pageSize
  //                 ),
  //               },
  //             },
  //           }
  //         : temp;

  //     setAllContracts(patched);
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchPurposes = async () => {
    try {
      const res = await getAllPurposes(100, 1);

      let temp = res?.data
        ?.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        })
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      temp.unshift({
        value: false,
        label: "Все",
      });
      setAllPurposes(temp);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchingContractors = async (defaultPageSize, defaultPage) => {
    try {
      const res = await getAllContractors(defaultPageSize, defaultPage);
      let temp = res?.data
        ?.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        })
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      temp.unshift({
        value: false,
        label: "Все",
      });
      setListContractors(temp);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetching(defaultPageSize, defaultPage);
    return () => debouncedTask.cancel();
  }, [
    selectedContractor,
    onlyAtWork,
    selectedPurpose,
    searchTask,
    onlyZeroSteps,
  ]);

  useEffect(() => {
    fetchPurposes();
    fetchingContractors(100, 1);
  }, []);

  useEffect(() => {
    const fetchCommentsCount = async () => {
      if (!allContracts?.data) return;

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
          } catch (error) {
            counts[contract.id] = 0;
          }
        })
      );

      setCommentsCount(counts);
    };

    fetchCommentsCount();
  }, [allContracts]);

  const columns = [
    {
      title: "Номер договора",
      dataIndex: "number",
      key: "number",
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Дата договора",
      dataIndex: "dateContract",
      key: "dateContract",
      render: (text) => <span>{dayjs(text).format("DD.MM.YYYY")}</span>,
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
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Назначение",
      dataIndex: "purpose",
      key: "purpose",
      render: (purpose) =>
        purpose ? <Tag color={purpose.color}>{purpose.name}</Tag> : false,
    },
    {
      title: "Количество выполненых этапов",
      dataIndex: "stepsComplited",
      key: "stepsComplited",
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Подрядчик",
      dataIndex: "contractor",
      key: "contractor",
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      render: (completed) =>
        completed ? (
          <Tag color={"volcano"}>Архивный</Tag>
        ) : (
          <Tag color={"green"}>В работе</Tag>
        ),
    },
    {
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
              Комментарии ({commentsCount[record.id] || 0})
            </a>
          </Space>
        </>
      ),
    },

    // {
    //   title: "Действия",
    //   key: "action",
    //   render: (_, record) => (
    //     <>
    //       <Space size="middle">
    //         <a onClick={() => openModal(record.documentId)}>Открыть договор</a>
    //       </Space>
    //       <Space size="middle">
    //         <a
    //           onClick={() => {
    //             setCommentContract(record);
    //             setIsCommentsOpen(true);
    //           }}
    //         >
    //           Комментарии
    //         </a>
    //       </Space>
    //     </>
    //   ),
    // },
  ];

  const data = allContracts?.data?.map((item) => ({
    key: item.id,
    id: item.id,
    documentId: item.documentId,
    number: item.number,
    dateContract: item.dateContract,
    description: item.description,
    contractor: item.contractor?.name,
    numberTask: item.numberTask,
    status: item.completed,
    purpose: item.purpose,
    stepsComplited: item.steps?.length,
    contractor_inn_kpp: `${item.contractor?.inn}/${item.contractor?.kpp}`,
  }));

  const handlerReload = async () => {
    if (pagination) {
      fetching(pagination.pageSize, pagination.current);
    } else {
      fetching(defaultPageSize, defaultPage);
    }
  };
  const handlerChange = async (pagination) => {
    // console.log("pagination", pagination);
    setPagination(pagination);
    fetching(pagination.pageSize, pagination.current);
  };
  const handlerAddNewContract = async () => {
    // console.log('Добавить новый объект');
    setIsOpenModalAddContract(true);
  };
  const openModal = async (documentId) => {
    setDocIdForModal(documentId);
    setIsOpenModal(true);
  };
  const closeModal = async () => {
    setDocIdForModal(null);
    setIsOpenModal(false);
  };
  const closeModalAddContract = async () => {
    setIsOpenModalAddContract(false);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <Flex gap={20} align="center">
          <Flex gap={10} align="center">
            <Text>Статус:</Text>
            <Select
              defaultValue={0}
              options={[
                {
                  value: 0,
                  label: "Все",
                },
                {
                  value: 1,
                  label: "В работе",
                },
                {
                  value: 2,
                  label: "Архивный",
                },
              ]}
              style={{ width: 150 }}
              onChange={(value) => {
                setOnlyAtWork(value);
              }}
            />
          </Flex>
          <Flex gap={10} align="center">
            <Text>Назначение:</Text>
            {allPurposes && (
              <Select
                defaultValue="Все"
                style={{ width: 150 }}
                onChange={(value) => {
                  setSelectedPurpose(value);
                }}
                options={allPurposes}
              />
            )}
          </Flex>

          <Input
            placeholder="Поиск по № Тех.-задания"
            allowClear
            style={{ width: 215 }}
            onChange={(e) => debouncedTask(e.target.value)}
          />

          <Checkbox
            checked={onlyZeroSteps}
            onChange={(e) => setOnlyZeroSteps(e.target.checked)}
          >
            0&nbsp;этапов
          </Checkbox>

          <Flex gap={10} align="center">
            <Text>Подрядчик:</Text>
            {listContractors && (
              <Select
                defaultValue="Все"
                style={{ width: 300 }}
                onChange={(value) => {
                  setSelectedContractor(value);
                }}
                options={listContractors}
                showSearch={true}
                optionFilterProp="label"
              />
            )}
          </Flex>
        </Flex>
        <Flex gap={20} align="center">
          <Tooltip title="Обновить">
            <a onClick={handlerReload}>
              <ReloadOutlined />
            </a>
          </Tooltip>
          {user?.role?.type !== "readadmin" && (
            <Button onClick={handlerAddNewContract} type="primary">
              Добавить новый договор
            </Button>
          )}
        </Flex>
      </Flex>
      <Table
        columns={columns}
        dataSource={data}
        pagination={{
          pageSizeOptions: [10, 25, 50, 100],
          showSizeChanger: {
            options: [
              {
                value: defaultPageSize,
                label: defaultPageSize + " / на странице",
              },
              { value: 25, label: 25 + " / на странице" },
              { value: 50, label: 50 + " / на странице" },
              { value: 100, label: 100 + " / на странице" },
            ],
          },
          defaultPageSize: defaultPageSize,
          defaultCurrent: defaultPage,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} из ${total} всего`,
          total:
            allContracts?.data?.length > 0
              ? allContracts.meta.pagination.total
              : 0,
          align: "center",
        }}
        onChange={handlerChange}
        loading={loading}
      />
      <ModalViewContract
        isOpenModal={isOpenModal}
        closeModal={closeModal}
        docIdForModal={docIdForModal}
        update={handlerReload}
      />
      <Modal
        title="Добавление нового договора"
        open={isOpenModalAddContract}
        onCancel={closeModalAddContract}
        footer={false}
      >
        <ModalAddContract
          isOpenModalAddContract={isOpenModalAddContract}
          closeModalAddContract={closeModalAddContract}
          update={handlerReload}
        />
      </Modal>

      <CommentDrawer
        open={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        contract={commentContract}
      />
    </div>
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

//   const fetching = async (pageSize = defaultPageSize, page = defaultPage) => {
//     try {
//       setLoading(true);

//       const temp = await getAllContracts(pageSize, page, {
//         contractorId: selectedContractor,
//         completed: onlyAtWork,
//         purposeId: selectedPurpose,
//       });

//       const filtered = searchTask
//         ? temp.data.filter((c) =>
//             (c.numberTask || "")
//               .toLowerCase()
//               .includes(searchTask.toLowerCase())
//           )
//         : temp.data;

//       const patched = searchTask
//         ? {
//             ...temp,
//             data: filtered,
//             meta: {
//               ...temp.meta,
//               pagination: {
//                 ...temp.meta.pagination,
//                 total: filtered.length,
//                 pageCount: Math.ceil(
//                   filtered.length / temp.meta.pagination.pageSize
//                 ),
//               },
//             },
//           }
//         : temp;

//       setAllContracts(patched);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

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
//     fetching(defaultPageSize, defaultPage);
//     return () => debouncedTask.cancel();
//   }, [selectedContractor, onlyAtWork, selectedPurpose, searchTask]);

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

//           <Input
//             placeholder="Поиск по Этапу"
//             allowClear
//             style={{ width: 215 }}
//             //Вот тут правим
//           />

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
