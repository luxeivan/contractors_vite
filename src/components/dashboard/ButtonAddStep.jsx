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
  Flex,
  Popconfirm,
  message,
} from "antd";
import axios from "axios";
import React, { useState } from "react";
import { server } from "../../config";

const { Text } = Typography;
const MAX_TOTAL = 20 * 1024 * 1024; 
const ALLOWED_RE = /\.(jpe?g|png)$/i; 

export default function ButtonAddStep({
  idContract,
  countSteps,
  updateContract,
  contractCompleted,
}) {
  const [form] = Form.useForm();
  const jwt = localStorage.getItem("jwt");
  const [msg, ctx] = message.useMessage();

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  /** список прикреплённых файлов
   *  { uid, file, thumbUrl, rotated (bool) } */
  const [items, setItems] = useState([]);

  /* ─────────────────────────── utils */

  const dataURL = (file) =>
    new Promise((r) => {
      const fr = new FileReader();
      fr.onload = (e) => r(e.target.result);
      fr.readAsDataURL(file);
    });

  /** повернуть на 90° CW ⇒ File+thumb */
  const rotateCW = async (it) => {
    const img = await new Promise((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.src = it.thumbUrl;
    });

    const c = document.createElement("canvas");
    const cx = c.getContext("2d");
    c.width = img.height;
    c.height = img.width;

    cx.translate(c.width / 2, c.height / 2);
    cx.rotate(Math.PI / 2);
    cx.drawImage(img, -img.width / 2, -img.height / 2);

    return new Promise((r) =>
      c.toBlob(
        (blob) => {
          const f = new File([blob], it.file.name, { type: it.file.type });
          const url = URL.createObjectURL(f);
          r({ ...it, file: f, thumbUrl: url, rotated: true });
        },
        it.file.type,
        0.9
      )
    );
  };

  /* ─────────────────────────── Upload */

  const uploadProps = {
    multiple: true,
    accept: ".jpg,.jpeg,.png",
    showUploadList: false,
    beforeUpload: async (raw) => {
      if (!ALLOWED_RE.test(raw.name)) {
        msg.error("Допустимы только файлы jpg / jpeg / png");
        return Upload.LIST_IGNORE;
      }

      let thumbUrl = await dataURL(raw);
      let obj = {
        uid: crypto.randomUUID(),
        file: raw,
        thumbUrl,
        rotated: false,
      };

      // авто-переворот: если вертикаль — крутим
      const img = new Image();
      img.src = thumbUrl;
      img.onload = async () => {
        if (img.height > img.width) {
          obj = await rotateCW(obj);
          console.log(`✅ ${obj.file.name} — ориентация исправлена (auto)`);
          msg.info(`${obj.file.name}: авто-переворот`, 2);
        }
        setItems((p) => [...p, obj]);
      };

      return Upload.LIST_IGNORE; // ручная загрузка
    },
  };

  /* ─────────────────────────── submit */

  const finish = async (vals) => {
    if (!items.length) return;
    const total = items.reduce((s, f) => s + f.file.size, 0);
    if (total > MAX_TOTAL) return msg.error("Размер файлов превышает 20 МБ");

    const fd = new FormData();
    items.forEach(({ file }) => fd.append("files", file));

    setSending(true);
    try {
      const up = await axios.post(`${server}/api/upload`, fd, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      await axios.post(
        `${server}/api/steps`,
        {
          data: {
            name: vals.name,
            description: vals.description,
            contract: idContract,
            photos: up.data.map((x) => x.id),
          },
        },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      setItems([]);
      setOpen(false);
      form.resetFields();
      updateContract();
    } catch (e) {
      console.error(e);
      msg.error("Не удалось добавить этап");
    } finally {
      setSending(false);
    }
  };

  /* ─────────────────────────── UI helpers */

  const Thumb = ({ it }) => (
    <Flex
      key={it.uid}
      align="center"
      justify="space-between"
      style={{
        border: "1px solid #d9d9d9",
        borderRadius: 6,
        padding: 6,
        marginBottom: 6,
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

      <span
        style={{
          flex: 1,
          marginLeft: 8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {it.file.name}
      </span>

      <Flex gap={10}>
        {it.rotated && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            auto
          </Text>
        )}

        <EyeOutlined
          style={{ cursor: "pointer" }}
          onClick={() => window.open(it.thumbUrl)}
        />

        <RotateRightOutlined
          style={{ cursor: "pointer" }}
          onClick={async () => {
            const upd = await rotateCW(it);
            setItems((p) => p.map((x) => (x.uid === it.uid ? upd : x)));
          }}
        />

        <DeleteOutlined
          style={{ cursor: "pointer" }}
          onClick={() => setItems((p) => p.filter((x) => x.uid !== it.uid))}
        />
      </Flex>
    </Flex>
  );

  /* ─────────────────────────── render */

  return (
    <>
      {ctx}
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
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={finish}
          initialValues={{ name: `Этап №${countSteps + 1}` }}
        >
          <Form.Item
            label="Название этапа"
            name="name"
            rules={[{ required: true, message: "Укажите название" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Описание" name="description">
            <Input.TextArea autoSize />
          </Form.Item>

          {/* ───────────── предупреждение (старый вид) */}
          <Flex vertical style={{ marginBottom: 8 }}>
            <Text style={{ color: "#999", fontSize: 12 }}>
              Размер файлов суммарно не должен превышать{" "}
              <span style={{ color: "#8f0000", fontWeight: 600 }}>20МБ</span>
            </Text>
            <Text style={{ color: "#999", fontSize: 12 }}>
              Допускаются файлы только формата:{" "}
              <span style={{ color: "#8f0000", fontWeight: 600 }}>jpg,</span>{" "}
              <span style={{ color: "#8f0000", fontWeight: 600 }}>jpeg,</span>{" "}
              <span style={{ color: "#8f0000", fontWeight: 600 }}>png</span>
            </Text>
          </Flex>

          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Выбрать фотографии</Button>
          </Upload>

          {/* previews */}
          <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 12 }}>
            {items.map((it) => (
              <Thumb key={it.uid} it={it} />
            ))}
          </div>

          <Popconfirm
            title="Добавить этап?"
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
