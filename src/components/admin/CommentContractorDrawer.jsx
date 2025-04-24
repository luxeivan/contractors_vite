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

export default function CommentContractorDrawer({ open, onClose, contractor }) {
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
    if (!contractor?.id) return;
    setLoading(true);
    try {
      const url =
        `${server}/api/comment-contractors?populate[author]=true` +
        `&populate[contractor]=true` +
        `&filters[contractor][id][$eq]=${contractor.id}` +
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
    if (!contractor?.id) return message.error("ID подрядчика не найден");
    setSaving(true);
    try {
      const body = {
        data: {
          text,
          contractor: contractor.id,
          ...(myId && { author: myId }),
        },
      };
      await fetchJSON(`${server}/api/comment-contractors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });
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
  }, [open, contractor?.id]);

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
      title={`Комментарии по подрядчику ${contractor?.name || ""}`}
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
