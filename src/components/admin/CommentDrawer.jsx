// src/components/admin/CommentDrawer.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Drawer,
  Timeline,
  Typography,
  Form,
  Input,
  Button,
  message,
  Spin,
  Avatar,
} from "antd";
import dayjs from "dayjs";
import { server } from "../../config";

const { Title, Text } = Typography;

/* ───────── вспомогалки ───────── */
const fetchJSON = (url, options = {}) =>
  fetch(url, options).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || r.statusText);
    return j;
  });

/* ───────── компонент ───────── */
export default function CommentDrawer({ open, onClose, contract }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const jwt = localStorage.getItem("jwt") || "";

  /* получаем id текущего пользователя единожды */
  const [myId, setMyId] = useState(null);
  useEffect(() => {
    if (!jwt) return;
    fetchJSON(`${server}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((u) => setMyId(u.id))
      .catch(() => setMyId(null));
  }, [jwt]);

  /* ───────── загрузка ───────── */
  const loadComments = async () => {
    if (!contract?.number) return;
    setLoading(true);
    try {
      const url =
        `${server}/api/comments` +
        `?populate[author]=true` +
        `&populate[contract]=true` +
        `&filters[contract][number][$eq]=${encodeURIComponent(
          contract.number
        )}` +
        `&sort=createdAt:asc`;

      const { data } = await fetchJSON(url, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setComments(data || []);
    } catch (err) {
      console.error(err);
      message.error("Не удалось получить комментарии");
    } finally {
      setLoading(false);
    }
  };

  /* ───────── отправка ───────── */
  const onFinish = async ({ text }) => {
    if (!text.trim()) return;
    const contractId = contract?.id ?? contract?.key;
    if (!contractId) return message.error("ID договора не найден");

    setSaving(true);
    try {
      /* 1. создаём комментарий (без автора, если myId ещё неизвестен) */
      const body = {
        data: { text, contract: contractId, ...(myId && { author: myId }) },
      };
      const created = await fetchJSON(`${server}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });

      /* 2. если автора добавить не удалось из-за myId=null, проставим PATCH-ем */
      if (!myId) {
        const me = await fetchJSON(`${server}/api/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        await fetchJSON(`${server}/api/comments/${created.data.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ data: { author: me.id } }),
        });
      }

      form.resetFields();
      loadComments();
      message.success("Комментарий добавлен");
    } catch (err) {
      console.error(err);
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ───────── при открытии ───────── */
  useEffect(() => {
    if (open) loadComments();
  }, [open, contract?.number]);

  /* ───────── items для Timeline ───────── */
  const items = useMemo(
    () =>
      comments.map((c) => {
        const name = c.author?.username ?? "—";
        return {
          key: c.id,
          dot: <Avatar size={24}>{name[0]?.toUpperCase() || "?"}</Avatar>,
          children: (
            <>
              <Text strong>{name}</Text>
              <br />
              <Text>{c.text}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(c.createdAt).format("DD.MM.YYYY HH:mm")}
              </Text>
            </>
          ),
        };
      }),
    [comments]
  );

  /* ───────── UI ───────── */
  return (
    <Drawer
      width={420}
      placement="right"
      open={open}
      onClose={onClose}
      title={`Комментарии к договору ${contract?.number || ""}`}
      destroyOnClose
    >
      {loading ? (
        <Spin style={{ display: "block", margin: 48 }} />
      ) : (
        <>
          {items.length === 0 ? (
            <Text type="secondary">Комментариев пока нет</Text>
          ) : (
            <Timeline items={items} style={{ marginBottom: 32 }} />
          )}

          <Title level={5}>Добавить комментарий</Title>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="text"
              rules={[{ required: true, message: "Введите текст комментария" }]}
            >
              <Input.TextArea rows={4} placeholder="Ваш комментарий…" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Отправить
            </Button>
          </Form>
        </>
      )}
    </Drawer>
  );
}

// import React, { useEffect, useState } from "react";
// import {
//   Drawer,
//   Timeline,
//   Typography,
//   Form,
//   Input,
//   Button,
//   message,
//   Spin,
// } from "antd";

// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// dayjs.extend(relativeTime);

// import { server } from "../../config";

// const { Title, Text } = Typography;

// export default function CommentDrawer({ open, onClose, contract }) {
//   const [comments, setComments] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [form] = Form.useForm();

//   const loadComments = async () => {
//     if (!contract?.number) return;

//     setLoading(true);

//     try {
//       const url =
//         `${server}/api/comments` +
//         `?populate=contract` +
//         `&filters[contract][number][$eq]=${encodeURIComponent(
//           contract.number
//         )}` +
//         `&sort=createdAt:asc`;

//       const res = await fetch(url, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
//         },
//       });

//       const json = await res.json();
//       if (!res.ok) throw new Error(json.error?.message || "Ошибка запроса");

//       setComments(json.data || []);
//     } catch (err) {
//       console.error(err);
//       message.error("Не удалось получить комментарии");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onFinish = async ({ text }) => {
//     if (!text.trim()) return;

//     // id может прийти как id, так и key
//     const contractId = contract?.id ?? contract?.key;
//     if (!contractId) {
//       message.error("Не удалось определить ID договора");
//       return;
//     }

//     setSaving(true);
//     try {
//       const res = await fetch(`${server}/api/comments`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
//         },
//         body: JSON.stringify({
//           data: { text, contract: contractId },
//         }),
//       });

//       const json = await res.json();
//       if (!res.ok) throw new Error(json.error?.message || "Ошибка сохранения");

//       form.resetFields();
//       loadComments();
//       message.success("Комментарий добавлен");
//     } catch (err) {
//       console.error(err);
//       message.error("Не удалось добавить комментарий");
//     } finally {
//       setSaving(false);
//     }
//   };

//   useEffect(() => {
//     if (open) loadComments();
//   }, [open, contract?.number]);

//   return (
//     <Drawer
//       width={420}
//       placement="right"
//       open={open}
//       onClose={onClose}
//       title={`Комментарии к договору ${contract?.number || ""}`}
//       destroyOnClose
//     >
//       {loading ? (
//         <Spin style={{ display: "block", margin: "48px auto" }} />
//       ) : (
//         <>
//           {comments.length === 0 ? (
//             <Text type="secondary">Комментариев пока нет</Text>
//           ) : (
//             <Timeline style={{ marginBottom: 32 }}>
//               {comments.map((c) => (
//                 <Timeline.Item key={c.id}>
//                   <Text>{c.text}</Text>
//                   <br />
//                   <Text type="secondary" style={{ fontSize: 12 }}>
//                     {dayjs(c.createdAt).format("DD.MM.YYYY HH:mm")}
//                   </Text>
//                 </Timeline.Item>
//               ))}
//             </Timeline>
//           )}

//           <Title level={5}>Добавить комментарий</Title>
//           <Form form={form} layout="vertical" onFinish={onFinish}>
//             <Form.Item
//               name="text"
//               rules={[{ required: true, message: "Введите текст комментария" }]}
//             >
//               <Input.TextArea rows={4} placeholder="Ваш комментарий…" />
//             </Form.Item>
//             <Button type="primary" htmlType="submit" loading={saving} block>
//               Отправить
//             </Button>
//           </Form>
//         </>
//       )}
//     </Drawer>
//   );
// }
