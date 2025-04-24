import React, { useEffect, useState } from "react";
import {
  Drawer,
  Timeline,
  Typography,
  Form,
  Input,
  Button,
  message,
  Spin,
} from "antd";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import { server } from "../../config";

const { Title, Text } = Typography;

export default function CommentDrawer({ open, onClose, contract }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadComments = async () => {
    if (!contract?.number) return;

    setLoading(true);

    try {
      const url =
        `${server}/api/comments` +
        `?populate=contract` +
        `&filters[contract][number][$eq]=${encodeURIComponent(
          contract.number
        )}` +
        `&sort=createdAt:asc`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Ошибка запроса");

      setComments(json.data || []);
    } catch (err) {
      console.error(err);
      message.error("Не удалось получить комментарии");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async ({ text }) => {
    if (!text.trim()) return;

    // id может прийти как id, так и key
    const contractId = contract?.id ?? contract?.key;
    if (!contractId) {
      message.error("Не удалось определить ID договора");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${server}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt") || ""}`,
        },
        body: JSON.stringify({
          data: { text, contract: contractId },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Ошибка сохранения");

      form.resetFields();
      loadComments();
      message.success("Комментарий добавлен");
    } catch (err) {
      console.error(err);
      message.error("Не удалось добавить комментарий");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (open) loadComments();
  }, [open, contract?.number]);

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
        <Spin style={{ display: "block", margin: "48px auto" }} />
      ) : (
        <>
          {comments.length === 0 ? (
            <Text type="secondary">Комментариев пока нет</Text>
          ) : (
            <Timeline style={{ marginBottom: 32 }}>
              {comments.map((c) => (
                <Timeline.Item key={c.id}>
                  <Text>{c.text}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(c.createdAt).format("DD.MM.YYYY HH:mm")}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
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
