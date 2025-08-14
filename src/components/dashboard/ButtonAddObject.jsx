import {
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  RotateRightOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Modal,
  Upload,
  Typography,
  Space,
  Popconfirm,
  message,
} from "antd";
import axios from "axios";
import React, { useState } from "react";
import { server } from "../../config";

const { Text } = Typography;

/**
 * Утилита: File → dataURL (для поворота через canvas)
 * @param {File} file
 * @returns {Promise<string>} dataURL
 */
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = (e) => resolve(e.target.result);
    fr.onerror = () => reject();
    fr.readAsDataURL(file);
  });

/**
 * Утилита: поворачивает картинку (dataURL → <canvas> → blob) на указанный угол (90|180|270)
 * и возвращает новый File + его blobURL.
 * @param {string} origDataUrl
 * @param {File} origFile
 * @param {number} angle (90|180|270)
 * @returns {Promise<{ file: File, thumbUrl: string }>}
 */
const rotateImageBlob = async (origDataUrl, origFile, angle) => {
  const img = await new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = origDataUrl;
  });

  const radians = (angle * Math.PI) / 180;
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  // Если угол 90 или 270, меняем размеры canvas
  if (angle === 90 || angle === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -w / 2, -h / 2);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // Бэкап: если по какой-то причине blob=null, возвращаем исходный файл
          return resolve({
            file: origFile,
            thumbUrl: URL.createObjectURL(origFile),
          });
        }
        const rotatedFile = new File([blob], origFile.name, {
          type: origFile.type,
        });
        const url = URL.createObjectURL(rotatedFile);
        resolve({ file: rotatedFile, thumbUrl: url });
      },
      origFile.type,
      0.9
    );
  });
};

export default function ButtonAddObject({
  idContract,
  countObject_constructions,
  updateContract,
  contractCompleted,
}) {
  const [form] = Form.useForm();
  const jwt = localStorage.getItem("jwt");
  const [msg, contextHolder] = message.useMessage();

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);


  

  const onFinish = async (values) => { 

    setSending(true);
    try {
      // Создаём новый объект
      await axios.post(
        `${server}/api/object-constructions`,
        {
          data: {
            name: values.name,            
            contract: idContract,
          },
        },
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      setOpen(false);
      form.resetFields();
      updateContract();
    } catch (err) {
      console.error(err);
      msg.error("Не удалось добавить этап");
    } finally {
      setSending(false);
    }
  };
  

  return (
    <>
      {contextHolder}
      <Button
        color="cyan" 
        variant="solid"
        disabled={contractCompleted}
        onClick={() => setOpen(true)}
      >
        {contractCompleted
          ? "В архивный договор нельзя добавить объект"
          : "Добавить объект строительства"}
      </Button>

      <Modal
        open={open}
        title="Добавить объект"
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          {/* Название этапа */}
          <Form.Item
            label="Название объекта"
            name="name"
            rules={[{ required: true, message: "Укажите название объекта" }]}
            initialValue={`Объект №${countObject_constructions + 1}`}
          >
            <Input />
          </Form.Item>

         

          {/* Кнопка “Добавить этап” */}
          <Popconfirm
            title="Добавить объект строительства"
            okText="Добавить"
            cancelText="Отмена"
            onConfirm={() => form.submit()}
          >
            <Button
              type="primary"
              block
              style={{ marginTop: 16 }}
              loading={sending}
            >
              Добавить объект
            </Button>
          </Popconfirm>
        </Form>
      </Modal>
    </>
  );
}
