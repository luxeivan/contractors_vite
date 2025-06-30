import { getAllContractors } from "../../lib/getData";
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
          options={options.sort((a, b) => a.label.localeCompare(b.label))}
          filterOption={(input, opt) =>
            opt.label.toLowerCase().includes(input.toLowerCase())
          }
          onChange={(val) => setSelId(val || null)}
        />

        <Flex gap={20} align="center">
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
        rowClassName={() => "hoverable-row"}
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
      {/* <CommentContractorDrawer
        open={commentsOpen}
        onClose={() => setCOpen(false)}
        contractor={commentsRec}
      /> */}
    </div>
  );
}
