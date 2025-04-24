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

const fetchJSON = (url, opt = {}) =>
  fetch(url, opt).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || r.statusText);
    return j;
  });

export default function CommentDrawer({ open, onClose, contract }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const jwt = localStorage.getItem("jwt") || "";

  const [myId, setMyId] = useState(null);
  
  useEffect(() => {
    if (!jwt) return;
    fetchJSON(`${server}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((u) => setMyId(u.id))
      .catch(() => setMyId(null));
  }, [jwt]);

  const loadComments = async () => {
    if (!contract?.number) return;
    setLoading(true);
    try {
      const url =
        `${server}/api/comments?populate[author]=true` +
        `&populate[contract]=true` +
        `&filters[contract][number][$eq]=${encodeURIComponent(
          contract.number
        )}` +
        `&sort=createdAt:asc`;

      const { data } = await fetchJSON(url, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setComments(data || []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось получить комментарии");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async ({ text }) => {
    if (!text.trim()) return;
    const contractId = contract?.id ?? contract?.key;
    if (!contractId) return message.error("ID договора не найден");
    setSaving(true);
    try {
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
    } catch (e) {
      console.error(e);
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (open) loadComments();
  }, [open, contract?.number]);

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

  return (
    <Drawer
      width={420}
      placement="right"
      open={open}
      onClose={onClose}
      title={`Комментарии к договору ${contract?.number || ""}`}
      destroyOnClose
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <Spin style={{ display: "block", margin: 48 }} />
          ) : items.length === 0 ? (
            <Text type="secondary">Комментариев пока нет</Text>
          ) : (
            <Timeline items={items} />
          )}
        </div>

        <div style={{ padding: 24, borderTop: "1px solid #f0f0f0" }}>
          <Title level={5}>Добавить комментарий</Title>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="text"
              rules={[{ required: true, message: "Введите текст комментария" }]}
            >
              <Input.TextArea rows={3} placeholder="Ваш комментарий…" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Отправить
            </Button>
          </Form>
        </div>
      </div>
    </Drawer>
  );
}

// import React, { useEffect, useState, useMemo } from "react";
// import {
//   Drawer,
//   Timeline,
//   Typography,
//   Form,
//   Input,
//   Button,
//   message,
//   Spin,
//   Avatar,
// } from "antd";
// import dayjs from "dayjs";
// import { server } from "../../config";

// const { Title, Text } = Typography;

// const fetchJSON = (url, options = {}) =>
//   fetch(url, options).then(async (r) => {
//     const j = await r.json().catch(() => ({}));
//     if (!r.ok) throw new Error(j.error?.message || r.statusText);
//     return j;
//   });

// export default function CommentDrawer({ open, onClose, contract }) {
//   const [comments, setComments] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [form] = Form.useForm();

//   const jwt = localStorage.getItem("jwt") || "";

//   const [myId, setMyId] = useState(null);
//   useEffect(() => {
//     if (!jwt) return;
//     fetchJSON(`${server}/api/users/me`, {
//       headers: { Authorization: `Bearer ${jwt}` },
//     })
//       .then((u) => setMyId(u.id))
//       .catch(() => setMyId(null));
//   }, [jwt]);

//   const loadComments = async () => {
//     if (!contract?.number) return;
//     setLoading(true);
//     try {
//       const url =
//         `${server}/api/comments` +
//         `?populate[author]=true` +
//         `&populate[contract]=true` +
//         `&filters[contract][number][$eq]=${encodeURIComponent(
//           contract.number
//         )}` +
//         `&sort=createdAt:asc`;

//       const { data } = await fetchJSON(url, {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       setComments(data || []);
//     } catch (err) {
//       console.error(err);
//       message.error("Не удалось получить комментарии");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onFinish = async ({ text }) => {
//     if (!text.trim()) return;
//     const contractId = contract?.id ?? contract?.key;
//     if (!contractId) return message.error("ID договора не найден");

//     setSaving(true);
//     try {
//       const body = {
//         data: { text, contract: contractId, ...(myId && { author: myId }) },
//       };
//       const created = await fetchJSON(`${server}/api/comments`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify(body),
//       });

//       if (!myId) {
//         const me = await fetchJSON(`${server}/api/users/me`, {
//           headers: { Authorization: `Bearer ${jwt}` },
//         });
//         await fetchJSON(`${server}/api/comments/${created.data.id}`, {
//           method: "PUT",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${jwt}`,
//           },
//           body: JSON.stringify({ data: { author: me.id } }),
//         });
//       }

//       form.resetFields();
//       loadComments();
//       message.success("Комментарий добавлен");
//     } catch (err) {
//       console.error(err);
//       message.error(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   useEffect(() => {
//     if (open) loadComments();
//   }, [open, contract?.number]);

//   const items = useMemo(
//     () =>
//       comments.map((c) => {
//         const name = c.author?.username ?? "—";
//         return {
//           key: c.id,
//           dot: <Avatar size={24}>{name[0]?.toUpperCase() || "?"}</Avatar>,
//           children: (
//             <>
//               <Text strong>{name}</Text>
//               <br />
//               <Text>{c.text}</Text>
//               <br />
//               <Text type="secondary" style={{ fontSize: 12 }}>
//                 {dayjs(c.createdAt).format("DD.MM.YYYY HH:mm")}
//               </Text>
//             </>
//           ),
//         };
//       }),
//     [comments]
//   );

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
//         <Spin style={{ display: "block", margin: 48 }} />
//       ) : (
//         <>
//           {items.length === 0 ? (
//             <Text type="secondary">Комментариев пока нет</Text>
//           ) : (
//             <Timeline items={items} style={{ marginBottom: 32 }} />
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
