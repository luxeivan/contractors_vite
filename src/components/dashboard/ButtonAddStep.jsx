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
 * Функция: считать из File первые 64 КБ, распарсить EXIF‐блок и вернуть tag Orientation (1, 3, 6, 8 или -1).
 * @param {File} file
 * @param {(orientation: number) => void} callback
 */
function getOrientation(file, callback) {
  const reader = new FileReader();
  // Читаем 64 КБ (не весь файл, чтобы быстрее)
  const blob = file.slice(0, 64 * 1024);
  reader.onload = function (e) {
    const view = new DataView(e.target.result);
    // Проверяем JPEG SOI
    if (view.getUint16(0, false) !== 0xffd8) {
      return callback(-2);
    }
    let length = view.byteLength;
    let offset = 2;
    while (offset < length) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        // APP1 marker найден
        const exifLength = view.getUint16(offset, false);
        offset += 2;
        if (view.getUint32(offset, false) !== 0x45786966) {
          // “Exif” не найден
          return callback(-1);
        }
        offset += 6;
        const little = view.getUint16(offset, false) === 0x4949; // II – little endian
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i++) {
          const tagOffset = offset + i * 12;
          const tag = view.getUint16(tagOffset, little);
          if (tag === 0x0112) {
            // Orientation
            const orientation = view.getUint16(tagOffset + 8, little);
            return callback(orientation);
          }
        }
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
    return callback(-1);
  };
  reader.readAsArrayBuffer(blob);
}

/**
 * Утилита: File → dataURL (для предпросмотра)
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
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);

  const w = img.width;
  const h = img.height;

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  // Если угол 90 или 270, надо поменять ширину/высоту canvas
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
        // Создаём новый File с тем же именем и типом
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
   * items: массив объектов с картинками, которые пользователь добавил:
   * [{ uid: string, file: File, thumbUrl: string, rotated: boolean }, …]
   */
  const [items, setItems] = useState([]);

  const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 МБ
  const ALLOWED_RE = /\.(jpe?g|png)$/i;

  /* ─────────────────────────────── Upload Props ─────────────────────────────── */

  const uploadProps = {
    multiple: true,
    accept: ".jpg,.jpeg,.png",
    showUploadList: false,
    beforeUpload: async (rawFile) => {
      // 1) Проверка формата
      if (!ALLOWED_RE.test(rawFile.name)) {
        msg.error("Допускаются файлы только формата: jpg, jpeg, png");
        return Upload.LIST_IGNORE;
      }

      // 2) Получаем dataURL для превью
      let dataUrl;
      try {
        dataUrl = await fileToDataURL(rawFile);
      } catch {
        msg.error("Не удалось прочитать файл");
        return Upload.LIST_IGNORE;
      }

      // 3) Определяем EXIF-ориентацию
      getOrientation(rawFile, async (orientation) => {
        let finalFile = rawFile;
        let finalThumb = dataUrl;
        let autoRotated = false;

        if (orientation === 3) {
          // «вверх ногами» → 180°
          const { file, thumbUrl } = await rotateImageBlob(
            dataUrl,
            rawFile,
            180
          );
          finalFile = file;
          finalThumb = thumbUrl;
          autoRotated = true;
          console.log(`✅ ${rawFile.name} — повёрнуто на 180° (EXIF=3)`);
        } else if (orientation === 6) {
          // поворот на 90°
          const { file, thumbUrl } = await rotateImageBlob(
            dataUrl,
            rawFile,
            90
          );
          finalFile = file;
          finalThumb = thumbUrl;
          autoRotated = true;
          console.log(`✅ ${rawFile.name} — повёрнуто на 90° (EXIF=6)`);
        } else if (orientation === 8) {
          // поворот на 270°
          const { file, thumbUrl } = await rotateImageBlob(
            dataUrl,
            rawFile,
            270
          );
          finalFile = file;
          finalThumb = thumbUrl;
          autoRotated = true;
          console.log(`✅ ${rawFile.name} — повёрнуто на 270° (EXIF=8)`);
        } else {
          // orientation = 1 или неизвестно → не трогаем
        }

        // 4) Добавляем в items
        const uid = crypto.randomUUID();
        setItems((prev) => [
          ...prev,
          { uid, file: finalFile, thumbUrl: finalThumb, rotated: autoRotated },
        ]);
      });

      // Ант Upload не добавляет автоматически, поэтому возвращаем LIST_IGNORE
      return Upload.LIST_IGNORE;
    },
  };

  /* ─────────────────────── Показать/удалить/повернуть/предпросмотр ─────────────────────── */

  // Ручной поворот на +90°
  const rotateManual = async (it) => {
    const { file: newFile, thumbUrl: newThumb } = await rotateImageBlob(
      it.thumbUrl,
      it.file,
      90
    );
    console.log(`🔄 ${it.file.name} — повёрнуто вручную на 90°`);
    setItems((prev) =>
      prev.map((x) =>
        x.uid === it.uid
          ? { uid: x.uid, file: newFile, thumbUrl: newThumb, rotated: true }
          : x
      )
    );
  };

  // Удалить файл
  const removeItem = (uid) => {
    setItems((prev) => prev.filter((x) => x.uid !== uid));
  };

  // Предпросмотр полного размера в новой вкладке
  const previewImage = (it) => {
    window.open(it.thumbUrl, "_blank");
  };


  const onFinish = async (values) => {
    if (!items.length) return;

    // Проверяем суммарный размер
    const totalSize = items.reduce((sum, x) => sum + x.file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return msg.error("Размер файлов суммарно не должен превышать 20 МБ");
    }

    const formData = new FormData();
    items.forEach((x) => formData.append("files", x.file));

    setSending(true);
    try {
      // 1) Загрузка на сервер
      const uploadRes = await axios.post(`${server}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      // 2) Создаём шаг (шаг → фото IDs из uploadRes)
      await axios.post(
        `${server}/api/steps`,
        {
          data: {
            name: values.name,
            description: values.description,
            contract: idContract,
            photos: uploadRes.data.map((item) => item.id),
          },
        },
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      // Сброс состояния
      setItems([]);
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


  const MiniThumb = ({ it }) => (
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
        alt={it.file.name}
        style={{
          height: 60,
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
          title="Просмотреть полноразмерно"
        />
        <RotateRightOutlined
          onClick={() => rotateManual(it)}
          style={{ cursor: "pointer", color: "#555" }}
          title="Повернуть на 90°"
        />
        <DeleteOutlined
          onClick={() => removeItem(it.uid)}
          style={{ cursor: "pointer", color: "#ff4d4f" }}
          title="Удалить"
        />
      </Space>
    </div>
  );

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
          {/* Название этапа */}
          <Form.Item
            label="Название этапа"
            name="name"
            rules={[{ required: true, message: "Укажите название этапа" }]}
            initialValue={`Этап №${countSteps + 1}`}
          >
            <Input />
          </Form.Item>

          {/* Описание */}
          <Form.Item label="Описание" name="description">
            <Input.TextArea autoSize />
          </Form.Item>

          {/* Информация о лимитах */}
          <div style={{ marginBottom: 12 }}>
            <Text style={{ color: "#999", fontSize: 12 }}>
              Размер файлов суммарно не должен превышать
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>20 МБ</Text>
            </Text>
            <br />
            <Text style={{ color: "#999", fontSize: 12 }}>
              Допускаются файлы только формата:
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>
                jpg,
              </Text>{" "}
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>jpeg,</Text>{" "}
              <Text style={{ color: "#8f0000", fontWeight: 600 }}>png</Text>
            </Text>
          </div>

          {/* Кнопка “Выбрать фотографии” */}
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} style={{ marginBottom: 12 }}>
              Выбрать фотографии
            </Button>
          </Upload>

          {/* Список миниатюр */}
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              marginTop: 8,
              paddingRight: 4,
            }}
          >
            {items.map((it) => (
              <MiniThumb key={it.uid} it={it} />
            ))}
          </div>

          {/* Кнопка “Добавить этап” */}
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
