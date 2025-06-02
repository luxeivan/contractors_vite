// src/components/dashboard/ButtonAddStep.jsx

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
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 МБ
const ALLOWED_RE = /\.(jpe?g|png)$/i; // jpg | jpeg | png

export default function ButtonAddStep({
  idContract,
  countSteps,
  updateContract,
  contractCompleted,
}) {
  const [form] = Form.useForm();
  const jwt = localStorage.getItem("jwt");
  const [msg, contextHolder] = message.useMessage();

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  /**
   * Список файлов:
   * [
   *   {
   *     uid: string,
   *     file: File,          // оригинальный или повёрнутый File
   *     thumbUrl: string,    // URL.createObjectURL(…) для предпросмотра
   *     rotated: boolean,    // true, если уже был поворот (авто или ручной)
   *   },
   *   …
   * ]
   */
  const [items, setItems] = useState([]);

  /* ───────────────────────────────────── helpers ───────────────────────────────────── */

  // Считает File как dataURL
  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = (e) => resolve(e.target.result);
      fr.onerror = () => reject();
      fr.readAsDataURL(file);
    });

  // Поворачивает изображение на заданный угол (90/180/270) и возвращает { file: File, thumbUrl: string }
  const rotateImage = async (orig, angle) => {
    const img = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = orig.thumbUrl;
    });

    const radians = (angle * Math.PI) / 180;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    const w = img.width;
    const h = img.height;

    // Новый canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Если угол 90 или 270, меняем размеры
    if (angle === 90 || angle === 270) {
      canvas.width = h;
      canvas.height = w;
    } else {
      canvas.width = w;
      canvas.height = h;
    }

    // Переносим в центр и поворачиваем
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -w / 2, -h / 2);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          const rotatedFile = new File([blob], orig.file.name, {
            type: orig.file.type,
          });
          const url = URL.createObjectURL(rotatedFile);
          resolve({ file: rotatedFile, thumbUrl: url });
        },
        orig.file.type,
        0.9
      );
    });
  };

  // Проверяет ориентацию: если высота > ширины (вертикальное), поворачивает на 90°
  // Возвращает обновлённый айтем (с rotated=true), а если не нужно — тот же объект, но с rotated=false
  const applyAutoRotate = async (item) => {
    const { file } = item;
    // Сначала получаем dataURL (он уже в item.thumbUrl, потому что мы создали)
    // Загружаем в Image
    const img = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = item.thumbUrl;
    });

    if (img.height > img.width) {
      // Вертикальная: поворачиваем на 90°
      const rotated = await rotateImage(item, 90);
      console.log(`✅ ${item.file.name} — поворачивается на 90° (авто)`);
      return {
        uid: item.uid,
        file: rotated.file,
        thumbUrl: rotated.thumbUrl,
        rotated: true,
      };
    } else {
      // Уже горизонтальная: без изменений
      return { ...item, rotated: false };
    }
  };

  /* ───────────────────────────────── uploadProps ───────────────────────────────── */

  const uploadProps = {
    multiple: true,
    accept: ".jpg,.jpeg,.png",
    showUploadList: false,
    beforeUpload: async (rawFile) => {
      // Проверка расширения
      if (!ALLOWED_RE.test(rawFile.name)) {
        msg.error("Допускаются только файлы .jpg, .jpeg или .png");
        return Upload.LIST_IGNORE;
      }

      // Создаём начальный dataURL
      let thumb = await fileToDataURL(rawFile);
      let newItem = {
        uid: crypto.randomUUID(),
        file: rawFile,
        thumbUrl: thumb,
        rotated: false,
      };

      // Применяем авто-поворот, если нужно
      newItem = await applyAutoRotate(newItem);

      // Добавляем в массив
      setItems((prev) => [...prev, newItem]);

      // Возвращаем LIST_IGNORE, чтобы антовский Upload не пытался сам отправить
      return Upload.LIST_IGNORE;
    },
  };

  /* ───────────────────────────────── handlers ───────────────────────────────── */

  const removeItem = (uid) => {
    setItems((prev) => prev.filter((it) => it.uid !== uid));
  };

  const rotateManual = async (item) => {
    // Каждый клик +90°
    const updated = await rotateImage(item, 90);
    setItems((prev) =>
      prev.map((it) =>
        it.uid === item.uid
          ? {
              uid: it.uid,
              file: updated.file,
              thumbUrl: updated.thumbUrl,
              rotated: true,
            }
          : it
      )
    );
    console.log(`🔄 ${item.file.name} — повёрнуто вручную на 90°`);
  };

  const previewImage = (item) => {
    window.open(item.thumbUrl, "_blank");
  };

  const onFinish = async (values) => {
    if (!items.length) return;
    const totalSize = items.reduce((sum, it) => sum + it.file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return msg.error("Размер файлов превышает 20 МБ");
    }

    const formData = new FormData();
    items.forEach((it) => formData.append("files", it.file));

    setSending(true);
    try {
      const uploadRes = await axios.post(`${server}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      await axios.post(
        `${server}/api/steps`,
        {
          data: {
            name: values.name,
            description: values.description,
            contract: idContract,
            photos: uploadRes.data.map((x) => x.id),
          },
        },
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      setItems([]);
      setOpen(false);
      form.resetFields();
      updateContract();
    } catch (error) {
      console.error(error);
      msg.error("Не удалось добавить этап");
    } finally {
      setSending(false);
    }
  };

  /* ───────────────────────────────── Thumb component ───────────────────────────────── */

  const Thumb = ({ it }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid #d9d9d9",
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
      }}
    >
      <img
        src={it.thumbUrl}
        alt=""
        style={{
          height: 60,
          width: "auto",
          maxWidth: 90,
          objectFit: "cover",
          borderRadius: 4,
        }}
      />
      <div
        style={{
          flex: 1,
          marginLeft: 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {it.file.name}
      </div>
      <Space size="small">
        <EyeOutlined
          onClick={() => previewImage(it)}
          style={{ cursor: "pointer", color: "#555" }}
        />
        <RotateRightOutlined
          onClick={() => rotateManual(it)}
          style={{ cursor: "pointer", color: "#555" }}
        />
        <DeleteOutlined
          onClick={() => removeItem(it.uid)}
          style={{ cursor: "pointer", color: "#ff4d4f" }}
        />
      </Space>
    </div>
  );

  /* ────────────────────────────────── Render ────────────────────────────────── */

  return (
    <>
      {contextHolder}
      <Button
        type="primary"
        disabled={contractCompleted}
        onClick={() => setOpen(true)}
      >
        {contractCompleted
          ? "В архивный договор нельзя добавить этап"
          : "Добавить выполненный этап"}
      </Button>

      <Modal
        open={open}
        title="Добавить выполненный этап"
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Название этапа"
            name="name"
            rules={[{ required: true, message: "Укажите название этапа" }]}
            initialValue={`Этап №${countSteps + 1}`}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Описание" name="description">
            <Input.TextArea autoSize />
          </Form.Item>

          <div style={{ marginBottom: 12 }}>
            <Text style={{ color: "#999", fontSize: 12 }}>
              Размер файлов суммарно не должен превышать{" "}
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>20 МБ</Text>
            </Text>
            <br />
            <Text style={{ color: "#999", fontSize: 12 }}>
              Допускаются файлы только формата:{" "}
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>jpg,</Text>{" "}
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>jpeg,</Text>{" "}
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>png</Text>
            </Text>
          </div>

          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} style={{ marginBottom: 12 }}>
              Выбрать фотографии
            </Button>
          </Upload>

          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              marginTop: 8,
              paddingRight: 4,
            }}
          >
            {items.map((it) => (
              <Thumb key={it.uid} it={it} />
            ))}
          </div>

          <Popconfirm
            title="Отправить этап?"
            okText="Добавить"
            cancelText="Отмена"
            onConfirm={() => form.submit()}
          >
            <Button
              type="primary"
              block
              style={{ marginTop: 16 }}
              disabled={!items.length}
              loading={sending}
            >
              Добавить этап
            </Button>
          </Popconfirm>
        </Form>
      </Modal>
    </>
  );
}

// import { UploadOutlined } from "@ant-design/icons";
// import {
//   Button,
//   Form,
//   Input,
//   Modal,
//   Upload,
//   Typography,
//   Flex,
//   Popconfirm,
//   message,
// } from "antd";
// import axios from "axios";
// import React, { useState } from "react";
// import { server } from "../../config";
// const { Text } = Typography;

// // function getCookie(name) {
// //     var matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
// //     return matches ? decodeURIComponent(matches[1]) : undefined;
// // }

// export default function ButtonAddStep({
//   idContract,
//   countSteps,
//   updateContract,
//   contractCompleted,
// }) {
//   const [form] = Form.useForm();
//   const jwt = localStorage.getItem("jwt");
//   // console.log(countSteps);
//   const [messageApi, contextHolder] = message.useMessage();
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [fileList, setFileList] = useState([]);
//   const [uploading, setUploading] = useState(false);
//   async function handleUpload(values) {
//     let summa = fileList.reduce((sum, current) => sum + current.size, 0);
//     if (summa > 20 * 1024 * 1024) {
//       return messageApi.open({
//         type: "error",
//         content: "Размер файлов превышает 20МБ",
//       });
//     }
//     // console.log("values", values)
//     const formData = new FormData();
//     fileList.forEach((file) => {
//       formData.append("files", file);
//     });
//     setUploading(true);
//     try {
//       const files = await axios.post(server + "/api/upload", formData, {
//         headers: {
//           Authorization: `Bearer ${jwt}`,
//         },
//       });
//       console.log("idContract", idContract);
//       if (files && files.data.length > 0) {
//         const newStep = await axios.post(
//           server + "/api/steps",
//           {
//             data: {
//               name: values.name,
//               contract: idContract,
//               // number: values.number,
//               description: values.description,
//               photos: files.data?.map((item) => item.id),
//             },
//           },
//           {
//             headers: {
//               Authorization: `Bearer ${jwt}`,
//             },
//           }
//         );
//         if (newStep) {
//           // console.log("newStep", newStep);
//           setFileList([]);
//           setIsModalOpen(false);
//           form.resetFields();
//           updateContract();
//         } else {
//           throw new Error("Ошибка добавления этапа");
//         }
//       } else {
//         throw new Error("Ошибка загрузки файлов");
//       }
//       // message.success('upload successfully.');
//     } catch (error) {
//       console.log("Ошибка добавления этапа: ", error);
//     }

//     setUploading(false);
//   }

//   const showModal = () => {
//     setIsModalOpen(true);
//   };

//   const handleOk = () => {
//     setIsModalOpen(false);
//   };

//   const handleCancel = () => {
//     setIsModalOpen(false);
//   };
//   const props = {
//     onRemove: (file) => {
//       const index = fileList.indexOf(file);
//       const newFileList = fileList.slice();
//       newFileList.splice(index, 1);
//       setFileList(newFileList);
//     },
//     beforeUpload: (file) => {
//       console.log("file", file);
//       setFileList((prev) => [...prev, file]);
//       return false;
//     },
//     fileList,
//   };
//   return (
//     <>
//       {contextHolder}
//       <Button type="primary" onClick={showModal} disabled={contractCompleted}>
//         {contractCompleted
//           ? "В архивный договор нельзя добавить этап"
//           : "Добавить выполненный этап"}
//       </Button>
//       <Modal
//         title="Добавить выполненный этап"
//         open={isModalOpen}
//         onOk={handleOk}
//         onCancel={handleCancel}
//         footer={false}
//       >
//         <Form
//           form={form}
//           onFinish={handleUpload}
//           labelCol={{ span: 8 }}
//           wrapperCol={{ span: 16 }}
//           style={{ maxWidth: 600 }}
//         >
//           {/* <Form.Item
//                         name='number'
//                         label="Номер этапа"
//                         required
//                         initialValue={countSteps + 1}
//                     >
//                         <InputNumber />
//                     </Form.Item> */}
//           <Form.Item
//             name="name"
//             label="Название этапа"
//             required
//             initialValue={`Этап №${countSteps + 1}`}
//           >
//             <Input />
//           </Form.Item>
//           <Form.Item name="description" label="Описание">
//             <Input.TextArea />
//           </Form.Item>
//           <Flex justify="end">
//             <Text style={{ color: "#999", fontSize: 12 }}>
//               Размер файлов суммарно не должен превышать{" "}
//               <span style={{ color: "#8f0000", fontWeight: 600 }}>20МБ</span>
//             </Text>
//           </Flex>
//           <Flex justify="end">
//             <Text style={{ color: "#999", fontSize: 12 }}>
//               Допускаются файлы только формата:{" "}
//               <span style={{ color: "#8f0000", fontWeight: 600 }}>jpg,</span>
//               <span style={{ color: "#8f0000", fontWeight: 600 }}>jpeg,</span>
//               <span style={{ color: "#8f0000", fontWeight: 600 }}>png,</span>
//             </Text>
//           </Flex>
//           <Upload {...props} multiple accept=".jpg,.jpeg,.png">
//             <Button icon={<UploadOutlined />}>Выбрать фотографии</Button>
//           </Upload>
//           <Popconfirm
//             title="Добавить этап"
//             description={
//               <Flex vertical>
//                 <Text>Пожалуйста, проверьте внесенные данные!</Text>
//                 <Text style={{ color: "#8f0000", fontWeight: 600 }}>
//                   После добавления изменить их нельзя.
//                 </Text>
//               </Flex>
//             }
//             onConfirm={() => {
//               form.submit();
//             }}
//             // onCancel={cancel}
//             okText="Добавить"
//             cancelText="Не добавлять"
//           >
//             <Button
//               type="primary"
//               // htmlType='submit'
//               disabled={fileList.length === 0}
//               loading={uploading}
//               style={{ marginTop: 16 }}
//             >
//               {uploading ? "Добавляется..." : "Добавить этап"}
//             </Button>
//           </Popconfirm>
//         </Form>
//       </Modal>
//     </>
//   );
// }
