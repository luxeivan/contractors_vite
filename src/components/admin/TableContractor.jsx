import { getAllContractors, getForFilterContractors } from "../../lib/getData";
import {
  Table,
  Flex,
  Button,
  Tooltip,
  Select,
  Modal,
  message,
  Badge,
} from "antd";
import { CommentOutlined, ReloadOutlined } from "@ant-design/icons";
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
  const [reload, setReload] = useState(false);


  /** `rows`  – список после фильтра (именно он идёт в таблицу) */
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});

  /** для Select */
  const [options, setOptions] = useState([]);
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
  async function fetchForFilterContractors() {
    try {
      const forFilterContractors = await getForFilterContractors()
      setOptions([
        ...forFilterContractors.map((c) => ({ value: c.documentId, label: c.name })),
      ]);
    } catch (error) {
      console.error(error);
      msg.error("Не удалось получить подрядчиков для фильтра");
    }
  }
  async function fetchAllContractors() {
    try {
      setLoading(true);
      const res = await getAllContractors(page, pageSize, [{ name: "documentId", value: selId }]);
      // console.log("res", res)
      setMeta(res.meta)
      setRows(res.data);
    } catch (e) {
      console.error(e);
      msg.error("Не удалось получить подрядчиков");
    } finally {
      setLoading(false);
    }
  }
  /* ─────────────── 1-разовая загрузка всех подрядчиков ─────────────── */
  useEffect(() => {
    fetchForFilterContractors()
  }, [reload]);
  useEffect(() => {
    fetchAllContractors()
  }, [page, pageSize, selId, reload]);

  /* ─────────────── колонки таблицы ─────────────── */
  const columns = [
    {
      title: "Наименование",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a onClick={() => setInfoId(record.docId)}>{text}</a>
      ),
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
      title: "",
      key: "actions",
      render: (_, r) => (
        <Flex size="middle" justify="center">
          <a
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setCRec(r);
              setCOpen(true);
            }}
          >
            {/* <CommentOutlined style={{
              fontSize: 24,
              color: "#1677ff"
            }} /> */}
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
          onChange={(val) => {
            setSelId(val)
            setPage(1)
          }}
        />

        <Flex gap={20} align="center">
          {/* Сброс / обновить */}
          <Tooltip title="Сбросить фильтр / обновить">

            <ReloadOutlined onClick={() => {
              setSelId(null)
              setPage(1)
              setPageSize(DEFAULT_PAGE_SIZE)
            }} />

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
        rowClassName={() => "hoverable-row"}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: meta?.pagination?.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "25", "50", "100"],
          showTotal: (tot, range) => `${range[0]}-${range[1]} из ${tot} всего`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        rowKey="key"
        onRow={(record, rowIndex) => {
          return {
            onClick: (event) => {
              setInfoId(record.docId);
            },
            style: {
              cursor: "pointer",
            },
          };
        }}
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
          update={() => {setReload(!reload) }}
        />
      </Modal>

      {/* Drawer «Комментарии» */}
      {/* <CommentContractorDrawer
        open={commentsOpen}
        onClose={() => setCOpen(false)}
        contractor={commentsRec}
      /> */}
    </div>
  );
}
