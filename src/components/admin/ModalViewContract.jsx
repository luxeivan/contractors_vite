// src/components/admin/ModalViewContract.jsx

import React, { useEffect, useState } from "react";
import {
  Modal,
  Descriptions,
  Flex,
  Collapse,
  Timeline,
  Avatar,
  Typography,
  Form,
  Input,
  Button,
  message,
  Spin,
  Popconfirm,
  Tag,
  Select
} from "antd";
import {
  getAllPurposes,
  getContractItem,
  changePurposeInContract,
  completedContract,
} from "../../lib/getData";
import ViewSteps from "./ViewSteps";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { server } from "../../config";
import useAuth from "../../store/authStore";

const { Panel } = Collapse;
const { Text: TextTy } = Typography;

/**
 * Утилита для fetch → JSON с проверкой статуса
 */
const fetchJSON = (url, opt = {}) =>
  fetch(url, opt).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || r.statusText);
    return j;
  });

/**
 * Запись лога-«комментария» для договора
 */
async function logContractAction({ contractId, text }) {
  const jwt = localStorage.getItem("jwt") || "";
  const meRes = await fetchJSON(`${server}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  await fetchJSON(`${server}/api/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      data: { text, contract: contractId, author: meRes.id },
    }),
  });
}

export default function ModalViewContract({
  isOpenModal,
  closeModal,
  docIdForModal,
  update,
}) {
  const { user } = useAuth((store) => store);

  // Состояние договора
  const [contract, setContract] = useState(null);
  const [loadingContract, setLoadingContract] = useState(true);

  // Назначения (для Select, если нужно менять назначение)
  const [purposeOptions, setPurposeOptions] = useState([]);

  // Комментарии (см. «### ОБНОВЛЕНИЕ ###»)
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [commentForm] = Form.useForm();
  const [myId, setMyId] = useState(null);

  // Смена назначений / завершение договора
  const [changingPurpose, setChangingPurpose] = useState(false);

  // ─────────────── Логика загрузки ───────────────

  // 1) При открытии модалки — подтягиваем договор и список назначений
  useEffect(() => {
    if (!docIdForModal || !isOpenModal) return;

    const fetchData = async () => {
      try {
        setLoadingContract(true);

        // 1.1) Сами данные договора
        const resContract = await getContractItem(docIdForModal);
        setContract(resContract);

        // 1.2) Список «назначений» (чтобы заполнить Select)
        const allPurposes = await getAllPurposes(100, 1);
        const mapped = allPurposes.data.map((p) => ({
          value: p.id,
          label: p.name,
        }));
        setPurposeOptions(mapped);

        // 1.3) Текущий пользователь (для комментариев)
        const jwt = localStorage.getItem("jwt") || "";
        if (jwt) {
          const me = await fetchJSON(`${server}/api/users/me`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });
          setMyId(me.id);
        }
      } catch (e) {
        console.error(e);
        message.error("Не удалось загрузить данные договора");
      } finally {
        setLoadingContract(false);
      }
    };

    fetchData();
  }, [docIdForModal, isOpenModal]);

  // 2) Как только объект договора появился — загружаем комментарии
  const loadComments = async () => {
    if (!contract?.id) return;
    setLoadingComments(true);
    try {
      const url =
        `${server}/api/comments?populate[author]=true` +
        `&filters[contract][id][$eq]=${contract.id}` +
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
    if (contract) {
      loadComments();
    }
  }, [contract]);

  // ─────────────── Обработчики ───────────────

  // Отправка нового комментария
  const handleAddComment = async ({ text }) => {
    if (!text.trim()) return;
    if (!contract?.id) return message.error("ID договора не найден");
    setSavingComment(true);
    try {
      const body = {
        data: {
          text: text.trim(),
          contract: contract.id,
          ...(myId && { author: myId }),
        },
      };
      await fetchJSON(`${server}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify(body),
      });
      commentForm.resetFields(); // ### ОБНОВЛЕНИЕ ###
      loadComments();
      // После добавления комментария можно также залогировать любое действие, если нужно:
      // await logContractAction({ contractId: contract.id, text: "Добавлен новый комментарий" });
    } catch (e) {
      console.error(e);
      message.error("Не удалось отправить комментарий");
    } finally {
      setSavingComment(false);
    }
  };

  // Смена «назначения»
  const handleChangePurpose = async (newPurposeId) => {
    if (!contract) return;
    setChangingPurpose(true);
    try {
      await changePurposeInContract(contract.documentId, newPurposeId);
      await logContractAction({
        contractId: contract.id,
        text: `📌 Назначение изменено на «${
          purposeOptions.find((p) => p.value === newPurposeId)?.label || "—"
        }»`,
      });
      // Обновляем данные договора и родительский список
      const updated = await getContractItem(contract.documentId);
      setContract(updated);
      update();
    } catch (e) {
      console.error("Ошибка при смене назначения:", e);
      message.error("Не удалось изменить назначение");
    } finally {
      setChangingPurpose(false);
    }
  };

  // Перевод договора в архив
  const handleComplete = async () => {
    if (!contract) return;
    try {
      const success = await completedContract(contract.documentId);
      if (success) {
        await logContractAction({
          contractId: contract.id,
          text: "🗄️ Договор переведён в архив",
        });
        const updated = await getContractItem(contract.documentId);
        setContract(updated);
        update();
      }
    } catch (e) {
      console.error("Ошибка при переводе в архив:", e);
      message.error("Не удалось перевести в архив");
    }
  };

  // ─────────────── Собираем описание договора ───────────────

  let descriptions = null;
  if (contract) {
    descriptions = [
      {
        key: "1",
        label: "Предмет договора",
        children: contract.description,
      },
      {
        key: "2",
        label: "Дата договора",
        children: (
          <span>{dayjs(contract.dateContract).format("DD.MM.YYYY")}</span>
        ),
      },
      {
        key: "3",
        label: "Номер Тех.Задания",
        children: contract.numberTask,
      },
      {
        key: "4",
        label: "Подрядчик",
        children: contract.contractor.name,
      },
      {
        key: "5",
        label: "ИНН-КПП",
        children: `${contract.contractor.inn}-${contract.contractor.kpp}`,
      },
      {
        key: "6",
        label: "Файл договора",
        children: contract.document ? (
          <Link to={`${server}${contract.document.url}`} target="_blank">
            {contract.document.name}
          </Link>
        ) : (
          <Text style={{ color: "#f00" }}>файл отсутствует</Text>
        ),
      },
      {
        key: "7",
        label: "Назначение",
        children:
          user?.role?.type === "readadmin" ? (
            <Tag color={contract.purpose.color}>{contract.purpose.name}</Tag>
          ) : (
            <Select
              style={{ minWidth: 300 }}
              value={contract.purpose?.id}
              onChange={handleChangePurpose}
              loading={changingPurpose}
              options={purposeOptions}
            />
          ),
      },
    ];
  }

  return (
    <Modal
      open={isOpenModal}
      onCancel={closeModal}
      title={
        !loadingContract && contract ? (
          <Flex gap={20}>
            <TextTy style={{ fontSize: 16 }}>Договор №{contract.number}</TextTy>
            <Flex>
              {contract.completed ? (
                <Tag color="volcano">Архивный</Tag>
              ) : (
                <Tag color="green">В работе</Tag>
              )}
              {contract.purpose && (
                <Tag color={contract.purpose.color}>
                  {contract.purpose.name}
                </Tag>
              )}
            </Flex>
          </Flex>
        ) : (
          "Загрузка договора..."
        )
      }
      footer={false}
      width={{ xl: 900, xxl: 1400 }}
      destroyOnClose
    >
      {/* ─────────── Сами данные договора ─────────── */}
      {loadingContract ? (
        <Flex justify="center">
          <Spin />
        </Flex>
      ) : (
        contract && (
          <Flex vertical gap={20}>
            <Descriptions items={descriptions} column={1} bordered />

            {/* ─────────── Блок «Комментарии» ─────────── */}
            <Collapse
              style={{ marginTop: 20 }}
              ghost
              expandIconPosition="right"
            >
              <Panel
                header={`Комментарии (${commentsCount})`}
                key="comments"
                style={{ border: "1px solid #f0f0f0" }}
              >
                {loadingComments ? (
                  <Spin style={{ display: "block", margin: "24px auto" }} />
                ) : comments.length > 0 ? (
                  <Timeline
                    style={{ marginBottom: 24 }}
                    items={comments.map((c) => {
                      const name = c.author?.username ?? "—";
                      return {
                        key: c.id,
                        dot: (
                          <Avatar size={24}>
                            {name[0]?.toUpperCase() || "?"}
                          </Avatar>
                        ),
                        children: (
                          <>
                            <TextTy strong>{name}</TextTy>
                            <br />
                            <TextTy>{c.text}</TextTy>
                            <br />
                            <TextTy type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(c.createdAt).format("DD.MM.YYYY HH:mm")}
                            </TextTy>
                          </>
                        ),
                      };
                    })}
                  />
                ) : (
                  <TextTy type="secondary">Комментариев пока нет</TextTy>
                )}

                {/* ─── Форма добавления нового комментария ─── */}
                <Form
                  form={commentForm} // ### ОБНОВЛЕНИЕ ###
                  layout="vertical"
                  onFinish={handleAddComment} // ### ОБНОВЛЕНИЕ ###
                >
                  <Form.Item
                    name="text"
                    rules={[
                      { required: true, message: "Введите текст комментария" },
                    ]}
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

            {/* ─────────── Список этапов ─────────── */}
            {contract.steps.length === 0 ? (
              <Title level={4} style={{ color: "#f00" }}>
                Этапов не добавлено
              </Title>
            ) : (
              <ViewSteps steps={contract.steps} />
            )}

            {/* ─────────── Кнопка «Перевести в архив» ─────────── */}
            {user?.role?.type !== "readadmin" && !contract.completed && (
              <Flex>
                <Popconfirm
                  title="Добавить в архив"
                  description="После добавления в архив пользователь не сможет добавлять этапы по договору"
                  onConfirm={() => {
                    handleComplete();
                    update();
                  }}
                  okText="Добавить"
                  cancelText="Не добавлять"
                  okType="danger"
                >
                  <Button danger>Добавить в архив</Button>
                </Popconfirm>
              </Flex>
            )}
          </Flex>
        )
      )}
    </Modal>
  );
}

// import {
//   changePurposeInContract,
//   completedContract,
//   getAllPurposes,
//   getContractItem,
// } from "../../lib/getData";
// import {
//   Button,
//   Descriptions,
//   Flex,
//   Form,
//   Modal,
//   Popconfirm,
//   Select,
//   Spin,
//   Tag,
// } from "antd";
// import React, { useEffect, useState } from "react";
// import ViewSteps from "./ViewSteps";
// import Title from "antd/es/typography/Title";
// import Text from "antd/es/typography/Text";
// import dayjs from "dayjs";
// import { Link } from "react-router-dom";
// import { server } from "../../config";
// import useAuth from "../../store/authStore";

// const fetchJSON = (url, opt = {}) =>
//   fetch(url, opt).then(async (r) => {
//     const j = await r.json().catch(() => ({}));
//     if (!r.ok) throw new Error(j.error?.message || r.statusText);
//     return j;
//   });

// async function logContractAction({ contractId, text }) {
//   const jwt = localStorage.getItem("jwt") || "";
//   const me = await fetchJSON(`${server}/api/users/me`, {
//     headers: { Authorization: `Bearer ${jwt}` },
//   });
//   await fetchJSON(`${server}/api/comments`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${jwt}`,
//     },
//     body: JSON.stringify({
//       data: { text, contract: contractId, author: me.id },
//     }),
//   });
// }

// export default function ModalViewContract({
//   isOpenModal,
//   closeModal,
//   docIdForModal,
//   update,
// }) {
//   const { user } = useAuth((store) => store);
//   const [contract, setContracts] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [purpose, setPurpose] = useState([]);
//   const fetchPurposes = async () => {
//     const allPurposes = await getAllPurposes(100, 1);
//     // console.log("allContractors", allContractors)
//     setPurpose(
//       allPurposes.data.map((item) => ({
//         value: item.id,
//         label: item.name,
//       }))
//     );
//   };
//   // console.log(docIdForModal);

//   const fetching = async (idContract) => {
//     try {
//       setLoading(true);
//       const temp = await getContractItem(idContract);
//       // console.log("temp", temp)
//       setContracts(temp);
//       setLoading(false);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     if (docIdForModal && isOpenModal === true) {
//       fetching(docIdForModal);
//       fetchPurposes();
//     }
//   }, [isOpenModal]);

//   const handlerChangePurpose = async (newPurposeId) => {
//     try {
//       await changePurposeInContract(contract.documentId, newPurposeId);
//       await logContractAction({
//         contractId: contract.id,
//         text: `📌 Назначение изменено на «${purpose.find((p) => p.value === newPurposeId)?.label ?? "—"
//           }»`,
//       });
//       await fetching(docIdForModal);
//       update();
//     } catch (error) {
//       console.log("error changePurpose:", error);
//     }
//   };

//   let propertiesContract = null;

//   if (contract) {
//     propertiesContract = [
//       // {
//       //     key: '1',
//       //     label: 'Номер',
//       //     children: contract.number,
//       // },
//       {
//         key: "4",
//         label: "Дата договора",
//         children: (
//           <span>{dayjs(contract.dateContract).format("DD.MM.YYYY")}</span>
//         ),
//       },
//       {
//         key: "1",
//         label: "Предмет договора",
//         children: contract.description,
//       },
//       {
//         key: "8",
//         label: "Назначение",
//         children: (
//           <Flex>
//             {user?.role?.type === "readadmin" ?
//               <Tag color={contract.purpose.color}>{contract.purpose.name}</Tag> :
//               <Select
//                 onChange={handlerChangePurpose}
//                 style={{ minWidth: 300 }}
//                 options={purpose}
//                 defaultValue={contract.purpose?.id}
//               />
//             }
//           </Flex>
//         ),
//       },
//       {
//         key: "6",
//         label: "Номер Тех.Задания",
//         children: contract.numberTask,
//       },
//       {
//         key: "2",
//         label: "Подрядчик",
//         children: contract.contractor.name,
//       },
//       {
//         key: "3",
//         label: "ИНН-КПП",
//         children: (
//           <span>
//             {contract.contractor.inn}-{contract.contractor.kpp}
//           </span>
//         ),
//       },
//       // {
//       //     key: '7',
//       //     label: 'Комментарий',
//       //     children: contract.comment,
//       // },
//       {
//         key: "5",
//         label: "Файл договора",
//         children: contract.document ? (
//           <Link to={`${server}${contract.document.url}`} target="_blank">
//             {contract.document.name}
//           </Link>
//         ) : (
//           <Text style={{ color: "#f00" }}>файл отсутствует</Text>
//         ),
//       },
//     ];
//   }

//   const handlerComplete = async (documentIdContract) => {
//     try {
//       if (await completedContract(documentIdContract)) {
//         await logContractAction({
//           contractId: contract.id,
//           text: "🗄️ Договор переведён в архив",
//         });
//         await fetching(documentIdContract);
//       }
//     } catch (error) {
//       console.log("error completeContract:", error);
//     }
//   };

//   // console.log("contract",contract);

//   return (
//     <Modal
//       open={isOpenModal}
//       onCancel={closeModal}
//       title={
//         !loading && contract ? (
//           <Flex gap={20}>
//             <Text style={{ fontSize: 16 }}>Договор№{contract.number} </Text>
//             <Flex>
//               {contract.completed ? (
//                 <Tag color={"volcano"}>Архивный</Tag>
//               ) : (
//                 <Tag color={"green"}>В работе</Tag>
//               )}
//               {contract.purpose && (
//                 <Tag color={contract.purpose.color}>
//                   {contract.purpose.name}
//                 </Tag>
//               )}
//             </Flex>
//           </Flex>
//         ) : (
//           "Загрузка договора..."
//         )
//       }
//       footer={false}
//       width={{ xl: 900, xxl: 1400 }}
//     >
//       {loading && (
//         <Flex justify="center">
//           <Spin />
//         </Flex>
//       )}

//       {!loading && contract && (
//         <Flex vertical gap={20}>
//           <Descriptions items={propertiesContract} column={1} bordered />
//           {contract.steps.length === 0 ? (
//             <Title level={4} style={{ color: "#f00" }}>
//               Этапов не добавлено
//             </Title>
//           ) : (
//             <ViewSteps steps={contract.steps} />
//           )}
//           {user?.role?.type !== "readadmin" && !contract.completed && (
//             <Flex>
//               <Popconfirm
//                 title="Добавить в архив"
//                 description="После добавления в архив пользователь не сможет добавлять этапы по договору"
//                 onConfirm={() => {
//                   handlerComplete(contract.documentId);
//                   update();
//                 }}
//                 // onCancel={cancel}
//                 okText="Добавить"
//                 cancelText="Не добавлять"
//                 okType="danger"
//               >
//                 <Button
//                   danger
//                 // onClick={() => { handlerComplete(contract.documentId) }}
//                 >
//                   Добавить в архив
//                 </Button>
//               </Popconfirm>
//             </Flex>
//           )}
//         </Flex>
//       )}
//     </Modal>
//   );
// }
