import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  Descriptions,
  Collapse,
  Timeline,
  Avatar,
  Typography,
  Form,
  Input,
  Button,
  message,
  Spin,
  Flex,
} from "antd";
import { getContractorItemForAdmin, updatePassword } from "../../lib/getData";
import { passwordStrength } from "check-password-strength";
import dayjs from "dayjs";
import { server } from "../../config";

const { Panel } = Collapse;
const { Title, Text } = Typography;

/**
 * Утилита для fetch → JSON с проверкой статуса.
 */
const fetchJSON = (url, opt = {}) =>
  fetch(url, opt).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || r.statusText);
    return j;
  });

/**
 * Генерация случайного «надёжного» пароля длиной length (по умолчанию 12).
 */
function generatePassword(length = 12) {
  const specials = "!_-";
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const all = specials + lowers + uppers + digits;

  let pwd = "";
  pwd += specials.charAt(Math.floor(Math.random() * specials.length));
  pwd += uppers.charAt(Math.floor(Math.random() * uppers.length));
  pwd += lowers.charAt(Math.floor(Math.random() * lowers.length));
  pwd += digits.charAt(Math.floor(Math.random() * digits.length));

  for (let i = 4; i < length; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }

  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function ModalViewContractor({
  isOpenModal,
  closeModal,
  docIdForModal,
}) {
  // Форма для смены пароля
  const [formChangePassword] = Form.useForm();

  // Форма для добавления комментария  ### ОБНОВЛЕНИЕ ###
  const [commentForm] = Form.useForm();

  // Состояние самой сущности «Подрядчик»
  const [contractor, setContractor] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Смена пароля
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Комментарии
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);

  // Состояние «сохраняем новый комментарий»
  const [savingComment, setSavingComment] = useState(false);
  const [myId, setMyId] = useState(null);

  const msg = message;

  // ─────────────── 
  // 1) Как только у нас появился docIdForModal и модалка открыта → грузим подрядчика
  useEffect(() => {
    if (!docIdForModal || !isOpenModal) return;

    const fetchInfo = async () => {
      try {
        setLoadingInfo(true);
        const res = await getContractorItemForAdmin(docIdForModal);
        setContractor(res);
      } catch (e) {
        console.error(e);
        msg.error("Не удалось загрузить информацию о подрядчике");
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchInfo();
  }, [docIdForModal, isOpenModal]);

  // ─────────────── 
  // 2) Как только компонент смонтирован, узнаём ID текущего пользователя (admin)
  useEffect(() => {
    const jwt = localStorage.getItem("jwt") || "";
    if (!jwt) return;
    fetchJSON(`${server}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((u) => setMyId(u.id))
      .catch(() => setMyId(null));
  }, []);

  // ─────────────── 
  // 3) Как только contractor загрузился — подтягиваем его комментарии
  const loadComments = async () => {
    if (!contractor?.id) return;
    setLoadingComments(true);
    try {
      const url =
        `${server}/api/comment-contractors?populate[author]=true` +
        `&filters[contractor][id][$eq]=${contractor.id}` +
        `&sort=createdAt:asc`;

      const { data, meta } = await fetchJSON(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      });
      setComments(data || []);
      setCommentsCount(meta.pagination.total);
    } catch (e) {
      console.error(e);
      message.error("Не удалось получить комментарии");
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (contractor) {
      loadComments();
    }
  }, [contractor]);

  // ─────────────── 
  // 4) При отправке нового комментария — сохраняем и сбрасываем поля commentForm
  const handleAddComment = async ({ text }) => {
    if (!text.trim()) return;
    if (!contractor?.id) return message.error("ID подрядчика не найден");
    setSavingComment(true);
    try {
      const body = {
        data: {
          text: text.trim(),
          contractor: contractor.id,
          ...(myId && { author: myId }),
        },
      };
      await fetchJSON(`${server}/api/comment-contractors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify(body),
      });
      // ### ОБНОВЛЕНИЕ ###
      // Сбрасываем именно поля формы комментариев, чтобы очистить textarea
      commentForm.resetFields();

      // Перезагружаем список, чтобы новый комментарий сразу появился
      loadComments();
    } catch (e) {
      console.error(e);
      message.error(e.message);
    } finally {
      setSavingComment(false);
    }
  };

  // ─────────────── 
  // 5) При отправке смены пароля — аналогично старому коду, но после логирования в комментарии
  const onFinishChangePassword = async (values) => {
    try {
      setChangingPassword(true);

      // 5.1 Меняем пароль у пользователя подрядчика
      await updatePassword(contractor.user.id, values.password);

      // 5.2 Логируем «⚙️ Пароль изменён» в comment-contractors
      const jwt = localStorage.getItem("jwt") || "";
      const meRes = await fetch(`${server}/api/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const me = await meRes.json();

      const bodyLog = {
        data: {
          text: "⚙️  Пароль пользователя был изменён",
          contractor: contractor.id,
          author: me.id,
        },
      };

      await fetch(`${server}/api/comment-contractors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(bodyLog),
      });

      setChangingPassword(false);
      setOpenChangePassword(false);
      formChangePassword.resetFields();
      message.success("Пароль успешно изменён");

      // Перегружаем комментарии, чтобы лог тоже появился в таймлайне
      loadComments();
    } catch (error) {
      console.log("Ошибка замены пароля", error);
      setChangingPassword(false);
      message.error("Не удалось изменить пароль");
    }
  };

  // ─────────────── 
  // Собираем свойства подрядчика для <Descriptions>
  let propertiesContractor = null;
  if (contractor) {
    propertiesContractor = [
      {
        key: "1",
        label: "Наименование",
        children: contractor.name,
      },
      {
        key: "2",
        label: "ИНН-КПП",
        children: `${contractor.inn}-${contractor.kpp}`,
      },
      {
        key: "3",
        label: "Создан",
        children: dayjs(contractor.createdAt).format("DD.MM.YYYY"),
      },
    ];
  }

  return (
    <Modal
      open={isOpenModal}
      onCancel={closeModal}
      title={
        !loadingInfo && contractor
          ? `Подрядчик ${contractor.name}`
          : "Загрузка подрядчика..."
      }
      footer={null}
      width={700}
      destroyOnClose
    >
      {/* ─────────── Информация о подрядчике ─────────── */}
      <Spin spinning={loadingInfo}>
        {contractor && (
          <Descriptions
            bordered
            column={1}
            size="small"
            labelStyle={{ width: 140 }}
          >
            {propertiesContractor.map((item) => (
              <Descriptions.Item key={item.key} label={item.label}>
                {item.children}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Spin>

      {/* ─────────── Кнопка “Сменить пароль” ─────────── */}
      {contractor && (
        <Button
          danger
          style={{ marginTop: 16 }}
          onClick={() => setOpenChangePassword((prev) => !prev)}
        >
          Сменить пароль пользователя
        </Button>
      )}

      {/* ─────────── Форма смены пароля ─────────── */}
      {openChangePassword && contractor && (
        <Form
          name="formChangePassword"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          style={{ marginTop: 16, maxWidth: 600 }}
          onFinish={onFinishChangePassword}
          form={formChangePassword}
          autoComplete="off"
        >
          <Flex justify="end">
            <Text style={{ color: "#999", fontSize: 10 }}>
              Пароль должен быть не менее 10 символов, содержать заглавную букву и спецсимвол
            </Text>
          </Flex>

          <Form.Item label="Пароль" required>
            <Input.Group compact>
              <Form.Item
                name="password"
                noStyle
                rules={[
                  { required: true, message: "Пожалуйста введите пароль." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (
                        passwordStrength(value).value === "Medium" ||
                        passwordStrength(value).value === "Strong"
                      ) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Пароль слишком слабый"));
                    },
                  }),
                ]}
              >
                <Input.Password style={{ width: "calc(100% - 120px)" }} />
              </Form.Item>
              <Button
                style={{ width: 120 }}
                onClick={() => {
                  const newPassword = generatePassword(12);
                  formChangePassword.setFieldsValue({
                    password: newPassword,
                    password2: newPassword,
                  });
                  formChangePassword.validateFields(["password", "password2"]);
                }}
              >
                Сгенерировать
              </Button>
            </Input.Group>
          </Form.Item>

          <Form.Item
            label="Пароль еще раз"
            name="password2"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Пожалуйста повторите пароль." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Пароли не совпадают"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item label={null}>
            <Button
              type="primary"
              htmlType="submit"
              loading={changingPassword}
            >
              {changingPassword ? "Изменяется..." : "Изменить"}
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ─────────── Блок “Комментарии” (Collapse) ─────────── */}
      {contractor && (
        <Collapse
          style={{ marginTop: 24 }}
          ghost
          expandIconPosition="right"
        >
          <Panel header={`Комментарии (${commentsCount})`} key="1" style={{ border: "1px solid #f0f0f0" }}>
            {loadingComments ? (
              <Spin style={{ display: "block", margin: "24px auto" }} />
            ) : comments.length > 0 ? (
              <Timeline
                style={{ marginBottom: 24 }}
                items={comments.map((c) => {
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
                })}
              />
            ) : (
              <Text type="secondary">Комментариев пока нет</Text>
            )}

            {/* ─── Форма для добавления нового комментария ─── */}
            <Form
              form={commentForm}            // ### ОБНОВЛЕНИЕ ###
              layout="vertical"
              onFinish={handleAddComment}   // ### ОБНОВЛЕНИЕ ###
            >
              <Form.Item
                name="text"
                rules={[{ required: true, message: "Введите текст комментария" }]}
              >
                <Input.TextArea rows={3} placeholder="Ваш комментарий…" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={savingComment}
                  block
                >
                  Отправить комментарий
                </Button>
              </Form.Item>
            </Form>
          </Panel>
        </Collapse>
      )}
    </Modal>
  );
}

// import { getContractorItemForAdmin, updatePassword } from "../../lib/getData";
// import {
//   Descriptions,
//   Flex,
//   Modal,
//   Spin,
//   Button,
//   Form,
//   Input,
//   Typography,
//   notification,
// } from "antd";
// import React, { useEffect, useState } from "react";
// import { passwordStrength } from "check-password-strength";
// import dayjs from "dayjs";
// // import { server } from "../../config";
// const { Text } = Typography;
// const Context = React.createContext({ name: "Default" });

// import { server } from "../../config";

// function generatePassword(length = 12) {
//   const specials = "!_-";
//   const lowers = "abcdefghijklmnopqrstuvwxyz";
//   const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//   const digits = "0123456789";
//   const all = specials + lowers + uppers + digits;

//   let pwd = "";
//   pwd += specials.charAt(Math.floor(Math.random() * specials.length));
//   pwd += uppers.charAt(Math.floor(Math.random() * uppers.length));
//   pwd += lowers.charAt(Math.floor(Math.random() * lowers.length));
//   pwd += digits.charAt(Math.floor(Math.random() * digits.length));

//   for (let i = 4; i < length; i++) {
//     pwd += all.charAt(Math.floor(Math.random() * all.length));
//   }

//   return pwd
//     .split("")
//     .sort(() => Math.random() - 0.5)
//     .join("");
// }

// export default function ModalViewContractor({
//   isOpenModal,
//   closeModal,
//   docIdForModal,
// }) {
//   const [formChangePassword] = Form.useForm();
//   const [contractor, setContractor] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [openChangePassword, setOpenChangePassword] = useState(false);
//   const [changingPassword, setChangingPassword] = useState(false);
//   const [api, contextHolder] = notification.useNotification();

//   const openNotification = () => {
//     api.success({
//       message: `Пароль изменен`,
//       // description: 'This is the content of the notification. This is the content of the notification. This is the content of the notification.',
//       placement: "top",
//     });
//   };

//   // console.log("contractor", contractor);
//   const onFinish = async (values) => {
//     try {
//       setChangingPassword(true);

//       /* 1. меняем пароль у пользователя подрядчика */
//       await updatePassword(contractor.user.id, values.password);

//       /* 2. пишем событие-лог в коллекцию comment-contractor */
//       const jwt = localStorage.getItem("jwt") || "";
//       const meRes = await fetch(`${server}/api/users/me`, {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       const me = await meRes.json(); // { id, username, ... }

//       const body = {
//         data: {
//           text: "⚙️  Пароль пользователя был изменён",
//           contractor: contractor.id,
//           author: me.id, // ← фикс: сохраняем админа-автора
//         },
//       };

//       await fetch(`${server}/api/comment-contractors`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify(body),
//       });

//       /* 3. завершаем процедуру */
//       setChangingPassword(false);
//       setOpenChangePassword(false);
//       formChangePassword.resetFields();
//       openNotification();
//     } catch (error) {
//       console.log("Ошибка замены пароля", error);
//       setChangingPassword(false);
//     }
//   };

//   const fetching = async (idContract) => {
//     try {
//       setLoading(true);
//       const temp = await getContractorItemForAdmin(idContract);
//       // console.log("temp", temp)
//       setContractor(temp);
//       setLoading(false);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     if (docIdForModal && isOpenModal === true) {
//       fetching(docIdForModal);
//     }
//   }, [isOpenModal]);

//   let propertiesContractor = null;

//   if (contractor) {
//     propertiesContractor = [
//       {
//         key: "1",
//         label: "Наименование",
//         children: contractor.name,
//       },
//       {
//         key: "2",
//         label: "ИНН-КПП",
//         children: `${contractor.inn}-${contractor.kpp}`,
//       },
//       {
//         key: "3",
//         label: "Создан",
//         children: dayjs(contractor.createdAt).format("DD.MM.YYYY"),
//       },
//     ];
//   }

//   const handleGeneratePassword = () => {
//     const newPassword = generatePassword(12);
//     formChangePassword.setFieldsValue({
//       password: newPassword,
//       password2: newPassword,
//     });
//     formChangePassword.validateFields(["password", "password2"]); // триггерим валидацию
//   };

//   return (
//     <Modal
//       open={isOpenModal}
//       onCancel={closeModal}
//       title={
//         !loading && contractor
//           ? `Подрядчик ${contractor.name}`
//           : "Загрузка подрядчика..."
//       }
//       footer={false}
//     >
//       <Context.Provider>
//         {contextHolder}
//         {loading && (
//           <Flex justify="center">
//             <Spin />
//           </Flex>
//         )}
//         {!loading && contractor && (
//           <Flex vertical gap={20}>
//             <Descriptions items={propertiesContractor} column={1} bordered />
//             {/* {contractor.steps.length === 0 ? <Title level={4} style={{color:"#f00"}}>Этапов не добавлено</Title> : <ViewSteps steps={contractor.steps} />
//                     } */}
//             <Button
//               danger
//               onClick={() => {
//                 setOpenChangePassword(!openChangePassword);
//               }}
//             >
//               Сменить пароль пользователя
//             </Button>

//             {openChangePassword && (
//               <Form
//                 name="formAddContractor"
//                 labelCol={{ span: 8 }}
//                 wrapperCol={{ span: 16 }}
//                 style={{ maxWidth: 600 }}
//                 initialValues={{ remember: true }}
//                 onFinish={onFinish}
//                 form={formChangePassword}
//                 // onFinishFailed={onFinishFailed}
//                 autoComplete="off"
//               >
//                 <Flex justify="end">
//                   <Text style={{ color: "#999", fontSize: 10 }}>
//                     Пароль должен быть не менее 10 символов иметь заглавную
//                     букву и спецсимвол
//                   </Text>
//                 </Flex>
//                 <Form.Item label="Пароль" required>
//                   <Input.Group compact>
//                     <Form.Item
//                       name="password"
//                       noStyle
//                       rules={[
//                         {
//                           required: true,
//                           message: "Пожалуйста введите пароль.",
//                         },
//                         ({ getFieldValue }) => ({
//                           validator(_, value) {
//                             if (
//                               passwordStrength(value).value === "Medium" ||
//                               passwordStrength(value).value === "Strong"
//                             ) {
//                               return Promise.resolve();
//                             }
//                             return Promise.reject(
//                               new Error("Пароль слишком слабый")
//                             );
//                           },
//                         }),
//                       ]}
//                     >
//                       <Input.Password style={{ width: "calc(100% - 120px)" }} />
//                     </Form.Item>
//                     <Button
//                       style={{ width: 120 }}
//                       onClick={handleGeneratePassword}
//                     >
//                       Сгенерировать
//                     </Button>
//                   </Input.Group>
//                 </Form.Item>

//                 <Form.Item
//                   label="Пароль еще раз"
//                   name="password2"
//                   dependencies={["password"]}
//                   rules={[
//                     {
//                       required: true,
//                       message: "Пожалуйста повторите пароль.",
//                     },
//                     ({ getFieldValue }) => ({
//                       validator(_, value) {
//                         if (!value || getFieldValue("password") === value) {
//                           return Promise.resolve();
//                         }
//                         return Promise.reject(new Error("Пароли не совпадают"));
//                       },
//                     }),
//                   ]}
//                 >
//                   <Input.Password />
//                 </Form.Item>

//                 <Form.Item label={null}>
//                   <Button type="primary" htmlType="submit">
//                     {changingPassword ? "Изменяется..." : "Изменить"}
//                   </Button>
//                 </Form.Item>
//               </Form>
//             )}
//           </Flex>
//         )}
//       </Context.Provider>
//     </Modal>
//   );
// }
