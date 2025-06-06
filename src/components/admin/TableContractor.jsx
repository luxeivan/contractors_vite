import { getAllContractors } from "../../lib/getData";
import { Table, Flex, Button, Tooltip, Select, Modal, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";

import ModalViewContractor from "./ModalViewContractor";
import ModalAddContractor from "./ModalAddContractor";
import CommentContractorDrawer from "./CommentContractorDrawer";
import useAuth from "../../store/authStore";

const DEFAULT_PAGE_SIZE = 10;

export default function TableContractor() {
  const { user } = useAuth((s) => s);

  /* ─────────────── state ─────────────── */
  const [loading, setLoading] = useState(true);

  /** `all`   – полный список (однократно с сервера) */
  const [all, setAll] = useState([]);
  /** `rows`  – список после фильтра (именно он идёт в таблицу) */
  const [rows, setRows] = useState([]);

  /** для Select */
  const [options, setOptions] = useState([{ value: "", label: "Все" }]);
  const [selId, setSelId] = useState(null);

  /** пагинация */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /** модалки / drawer */
  const [infoId, setInfoId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [commentsOpen, setCOpen] = useState(false);
  const [commentsRec, setCRec] = useState(null);

  const msg = message;

  /* ─────────────── 1-разовая загрузка всех подрядчиков ─────────────── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getAllContractors(1000, 1, {});
        setAll(res.data);
        setRows(res.data);
        setOptions([
          { value: "", label: "Все" },
          ...res.data.map((c) => ({ value: c.id, label: c.name })),
        ]);
      } catch (e) {
        console.error(e);
        msg.error("Не удалось получить подрядчиков");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─────────────── фильтрация при выборе подрядчика ─────────────── */
  useEffect(() => {
    if (!selId) {
      setRows(all);
    } else {
      setRows(all.filter((c) => c.id === selId));
    }
    setPage(1); 
  }, [selId, all]);

  /* ─────────────── колонки таблицы ─────────────── */
  const columns = [
    {
      title: "Наименование",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "ИНН-КПП / ОГРНИП",
      dataIndex: "innkpp",
      key: "innkpp",
    },
    {
      title: "Создан",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => (
        <span style={{ color: "#666" }}>
          {dayjs(d).format("DD.MM.YYYY HH:mm")}
        </span>
      ),
    },
  ];

  if (user?.role?.type !== "readadmin") {
    columns.push({
      title: "Действия",
      key: "actions",
      render: (_, r) => (
        <Flex gap={12}>
          <a onClick={() => setInfoId(r.docId)}>Информация</a>
          <a
            onClick={() => {
              setCRec(r);
              setCOpen(true);
            }}
          >
            Комментарии
          </a>
        </Flex>
      ),
    });
  }

  /* ─────────────── данные для таблицы ─────────────── */
  const data = rows.map((c) => ({
    key: c.id,
    docId: c.documentId,
    name: c.name,
    innkpp: c.kpp ? `${c.inn}-${c.kpp}` : `${c.inn}-${c.ogrnip}`,
    createdAt: c.createdAt,
  }));

  /* ─────────────── JSX ─────────────── */
  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        {/* Select-поиск подрядчика */}
        <Select
          allowClear
          showSearch
          style={{ width: 400 }}
          placeholder="Подрядчик"
          value={selId || undefined}
          optionFilterProp="label"
          options={options}
          filterOption={(input, opt) =>
            opt.label.toLowerCase().includes(input.toLowerCase())
          }
          onChange={(val) => setSelId(val || null)}
        />

        <Flex gap={20}>
          {/* Сброс / обновить */}
          <Tooltip title="Сбросить фильтр / обновить">
            <a
              onClick={() => {
                setSelId(null);
                setOptions([
                  { value: "", label: "Все" },
                  ...all.map((c) => ({ value: c.id, label: c.name })),
                ]);
              }}
            >
              <ReloadOutlined />
            </a>
          </Tooltip>

          {user.role.type !== "readadmin" && (
            <Button type="primary" onClick={() => setAddOpen(true)}>
              Добавить нового подрядчика
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Таблица */}
      <Table
        columns={columns}
        dataSource={data.slice((page - 1) * pageSize, page * pageSize)}
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: rows.length,
          showSizeChanger: true,
          pageSizeOptions: ["10", "25", "50", "100"],
          showTotal: (tot, range) => `${range[0]}-${range[1]} из ${tot} всего`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        rowKey="key"
      />

      {/* Модалка «Информация» */}
      <ModalViewContractor
        isOpenModal={!!infoId}
        closeModal={() => setInfoId(null)}
        docIdForModal={infoId}
      />

      {/* Модалка «Добавить подрядчика» */}
      <Modal
        title="Добавление нового подрядчика"
        open={addOpen}
        footer={false}
        onCancel={() => setAddOpen(false)}
        destroyOnClose
      >
        <ModalAddContractor
          closeModalAddContract={() => setAddOpen(false)}
          update={() => {
            setLoading(true);
            // перезагружаем весь справочник
            (async () => {
              const res = await getAllContractors(1000, 1, {});
              setAll(res.data);
              setRows(res.data);
              setOptions([
                { value: "", label: "Все" },
                ...res.data.map((c) => ({ value: c.id, label: c.name })),
              ]);
              setLoading(false);
            })();
          }}
        />
      </Modal>

      {/* Drawer «Комментарии» */}
      <CommentContractorDrawer
        open={commentsOpen}
        onClose={() => setCOpen(false)}
        contractor={commentsRec}
      />
    </div>
  );
}

// import { getAllContractors } from "../../lib/getData";
// import {
//   Table,
//   Space,
//   Pagination,
//   Flex,
//   Switch,
//   Button,
//   Modal,
//   Tooltip,
//   Input,
// } from "antd";
// import { debounce } from "lodash";

// import React, { useEffect, useState, useMemo } from "react";
// import { ReloadOutlined } from "@ant-design/icons";
// import ModalViewContractor from "./ModalViewContractor";
// import ModalAddContractor from "./ModalAddContractor";
// import CommentContractorDrawer from "./CommentContractorDrawer";
// import useAuth from "../../store/authStore";
// import dayjs from "dayjs";
// const defaultPageSize = 10;
// const defaultPage = 1;

// export default function TableContractor() {
//   const { user } = useAuth((store) => store);
//   const [pagination, setPagination] = useState();
//   const [allContractors, setAllContractors] = useState();
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const debouncedSearch = useMemo(
//     () => debounce((val) => setSearch(val.trim()), 500),
//     []
//   );

//   const [isOpenModal, setIsOpenModal] = useState(false);
//   const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false);
//   const [docIdForModal, setDocIdForModal] = useState(null);

//   const [isCommentsOpen, setIsCommentsOpen] = useState(false);
//   const [commentContractor, setCommentContractor] = useState(null);

//   const fetching = async (defaultPageSize, defaultPage) => {
//     try {
//       setLoading(true);
//       const temp = await getAllContractors(
//         defaultPageSize,
//         defaultPage,
//         search ? { "filters[name][$containsi]": search } : {}
//       );

//       // console.log("temp", temp)
//       const filtered = search
//         ? temp.data.filter((c) =>
//             c.name.toLowerCase().includes(search.toLowerCase())
//           )
//         : temp.data;

//       if (search) {
//         const pageSize = temp.meta.pagination.pageSize;
//         const patchedMeta = {
//           ...temp.meta,
//           pagination: {
//             ...temp.meta.pagination,
//             total: filtered.length,
//             pageCount: Math.ceil(filtered.length / pageSize),
//           },
//         };
//         setAllContractors({ ...temp, meta: patchedMeta, data: filtered });
//       } else {
//         setAllContractors(temp); // без поиска – используем оригинальную пагинацию
//       }

//       setLoading(false);
//     } catch (error) {
//       console.log(error);
//     }
//   };
//   useEffect(() => {
//     fetching(defaultPageSize, defaultPage);
//     return () => debouncedSearch.cancel();
//   }, [search]);

//   // console.log("allContractors", allContractors);
//   const columns = [
//     // {
//     //   title: 'Подрядчик',
//     //   dataIndex: 'contractor',
//     //   key: 'contractor',
//     //   render: text => <span>{text}</span>,
//     // },
//     {
//       title: "Наименование",
//       dataIndex: "name",
//       key: "name",
//       render: (text) => <span>{text}</span>,
//     },
//     {
//       title: "ИНН-КПП(ОГРНИП)",
//       dataIndex: "contractor_inn_kpp",
//       key: "contractor_inn_kpp",
//       render: (text) => <span>{text}</span>,
//     },
//     {
//       title: "Создан",
//       dataIndex: "createdAt",
//       key: "createdAt",
//       render: (date) => (
//         <span style={{ color: "#666" }}>
//           {dayjs(date).format("DD.MM.YYYY HH:mm")}
//         </span>
//       ),
//     },
//     // {
//     //   title: 'Социальный объект',
//     //   dataIndex: 'social',
//     //   key: 'social',
//     //   render: bool => <Switch disabled defaultValue={bool} />,
//     // },
//     // {
//     //   title: "Комментарий",
//     //   dataIndex: "comment",
//     //   key: "comment",
//     //   render: (text) => <span>{text}</span>,
//     // },
//   ];
//   if (user?.role?.type !== "readadmin") {
//     columns.push({
//       title: "Действия",
//       key: "action",
//       render: (_, record) => (
//         <Flex gap={12}>
//           <a onClick={() => openModal(record.documentId)}>Информация</a>
//           <a
//             onClick={() => {
//               setCommentContractor(record);
//               setIsCommentsOpen(true);
//             }}
//           >
//             Комментарии
//           </a>
//         </Flex>
//       ),
//     });
//   }
//   const data = allContractors?.data?.map((item) => ({
//     id: item.id,
//     key: item.id,
//     documentId: item.documentId,
//     name: item.name,
//     description: item.description,
//     createdAt: item.createdAt,
//     comment: item.comment,
//     // contractor: item.contractor.name,
//     // social: item.social,
//     contractor_inn_kpp: item.kpp?`${item.inn}-${item.kpp}`:`${item.inn}-${item.ogrnip}`,
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
//     // console.log('Добавить новый договор');
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
//         <Input
//           placeholder="Поиск подрядчика"
//           allowClear
//           style={{ width: 400 }}
//           onChange={(e) => debouncedSearch(e.target.value)}
//         />
//         <Flex gap={20} align="center">
//           <Tooltip title="Обновить">
//             <a onClick={handlerReload}>
//               <ReloadOutlined />
//             </a>
//           </Tooltip>
//           {user.role.type !== "readadmin" && (
//             <Button onClick={handlerAddNewContract} type="primary">
//               Добавить нового подрядчика
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
//             allContractors?.data?.length > 0
//               ? allContractors.meta.pagination.total
//               : 0,
//           align: "center",
//         }}
//         onChange={handlerChange}
//         loading={loading}
//       />
//       <ModalViewContractor
//         isOpenModal={isOpenModal}
//         closeModal={closeModal}
//         docIdForModal={docIdForModal}
//       />
//       <Modal
//         title="Добавление нового подрядчика"
//         open={isOpenModalAddContract}
//         onCancel={closeModalAddContract}
//         footer={false}
//       >
//         <ModalAddContractor
//           isOpenModalAddContract={isOpenModalAddContract}
//           closeModalAddContract={closeModalAddContract}
//           update={handlerReload}
//         />
//       </Modal>
//       <CommentContractorDrawer
//         open={isCommentsOpen}
//         onClose={() => setIsCommentsOpen(false)}
//         contractor={commentContractor}
//       />
//     </div>
//   );
// }
