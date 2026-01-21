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
  Select,
  Card,
  ConfigProvider,
  DatePicker,
  Popover,
} from "antd";
import {
  getAllPurposes,
  getAllFilials,
  getContractItem,
  changePurposeInContract,
  changeFilialInContract,
  completedContract,
} from "../../lib/getData";
import ViewSteps from "./ViewSteps";
// import Title from "antd/es/typography/Title";
// import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { server } from "../../config";
import useAuth from "../../store/authStore";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Panel } = Collapse;
const { Text, Title } = Typography;

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

  // Назначения (для Select, если нужно менять назначение)
  const [filialOptions, setFilialOptions] = useState([]);

  // Комментарии (см. «### ОБНОВЛЕНИЕ ###»)
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [commentForm] = Form.useForm();
  const [myId, setMyId] = useState(null);

  // Смена назначений / завершение договора
  const [changingPurpose, setChangingPurpose] = useState(false);

  // Смена филиала 
  const [changingFilial, setChangingFilial] = useState(false);

  useEffect(() => {
    console.log("contract", contract);

  }, [contract])
  // ─────────────── Логика загрузки ───────────────

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

      // 1.3) Список «назначений» (чтобы заполнить Select)
      const allFilials = await getAllFilials(100, 1);
      const mappedFilials = allFilials.data.map((p) => ({
        value: p.id,
        label: p.name,
      }));
      setFilialOptions(mappedFilials);

      // 1.4) Текущий пользователь (для комментариев)
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
  // 1) При открытии модалки — подтягиваем договор и список назначений
  useEffect(() => {
    if (!docIdForModal || !isOpenModal) return;


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
        text: `📌 Назначение изменено на «${purposeOptions.find((p) => p.value === newPurposeId)?.label || "—"
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
  // Смена «филиала»
  const handleChangeFilials = async (newFilialId) => {
    if (!contract) return;
    setChangingPurpose(true);
    try {
      await changeFilialInContract(contract.documentId, newFilialId);
      await logContractAction({
        contractId: contract.id,
        text: `📌 Филиал изменен на «${filialOptions.find((p) => p.value === newFilialId)?.label || "—"
          }»`,
      });
      // Обновляем данные договора и родительский список
      const updated = await getContractItem(contract.documentId);
      setContract(updated);
      update();
    } catch (e) {
      console.error("Ошибка при смене назначения:", e);
      message.error("Не удалось изменить филиал");
    } finally {
      setChangingFilial(false);
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
        label: <>Дата завершения работ по договору 
        {/* <Popover content={"со стороны подрядной организации согласно условиям договора подряда"}>
          <InfoCircleOutlined style={{color:"#e37021",cursor:"pointer"}}/>
        </Popover> */}
        </>,
        children:
          user?.role?.type === "readadmin" ? (
            contract.dateEndContract
              ? dayjs(contract.dateEndContract).format("DD.MM.YYYY")
              : "не указана"
          ) : (
            (() => {
              // Сохраняем предыдущее значение даты окончания
              const prevDateEnd = contract.dateEndContract;
              return (
                <DatePicker
                  format="DD.MM.YYYY"
                  allowClear
                  placeholder="Выбрать дату"
                  value={
                    contract.dateEndContract
                      ? dayjs(contract.dateEndContract)
                      : null
                  }
                  onChange={async (d) => {
                    // Сравнить даты: если одинаковы, ничего не делать
                    const prev = prevDateEnd ? dayjs(prevDateEnd) : null;
                    const next = d ? dayjs(d) : null;
                    let changed = false;
                    if (!prev && next) changed = true;
                    else if (prev && !next) changed = true;
                    else if (prev && next && !prev.isSame(next, "day")) changed = true;
                    if (!changed) return;
                    try {
                      await fetchJSON(
                        `${server}/api/contracts/${contract.documentId}`,
                        {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("jwt")}`,
                          },
                          body: JSON.stringify({
                            data: {
                              dateEndContract: d
                                ? d.format("YYYY-MM-DD")
                                : null,
                            },
                          }),
                        }
                      );
                      // Логирование изменения даты окончания
                      if (!prev && next) {
                        await logContractAction({
                          contractId: contract.id,
                          text: `📅 Дата окончания договора установлена: ${dayjs(d).format("DD.MM.YYYY")}`,
                        });
                      } else if (prev && !next) {
                        await logContractAction({
                          contractId: contract.id,
                          text: `❌ Дата окончания договора удалена (была ${dayjs(prevDateEnd).format("DD.MM.YYYY")})`,
                        });
                      } else if (prev && next && !prev.isSame(next, "day")) {
                        await logContractAction({
                          contractId: contract.id,
                          text: `🔄 Дата окончания договора изменена: ${dayjs(prevDateEnd).format("DD.MM.YYYY")} → ${dayjs(d).format("DD.MM.YYYY")}`,
                        });
                      }
                      const updated = await getContractItem(contract.documentId);
                      setContract(updated);
                      update();
                    } catch {
                      message.error("Не удалось сохранить дату окончания");
                    }
                  }}
                />
              );
            })()
          ),
      },
      {
        key: "4",
        label: "Номер Тех.Задания",
        children: contract.numberTask,
      },
      {
        key: "5",
        label: "Подрядчик",
        children: contract.contractor.name,
      },
      {
        key: "6",
        label: "ИНН-КПП",
        children: `${contract.contractor.inn}-${contract.contractor.kpp}`,
      },
      {
        key: "7",
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
        key: "8",
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
      {
        key: "9",
        label: "Филиал",
        children:
          user?.role?.type === "readadmin" ? (
            <Tag color={contract?.filial?.color}>{contract?.filial?.name}</Tag>
          ) : (
            <Select
              style={{ minWidth: 300 }}
              value={contract.filial?.id}
              onChange={handleChangeFilials}
              loading={changingFilial}
              options={filialOptions}
            />
          ),
      },
      {
        key: "10",
        label: "Рамочный договор (по объектам)",
        children: contract.overhaul ? "да" : "нет"
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
            <Text style={{ fontSize: 16 }}>Договор №{contract.number}</Text>
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
            {contract.overhaul && <Flex vertical>
              {/* <Typography.Title level={4}>Объекты капитального ремонта:</Typography.Title> */}
              <ConfigProvider
                theme={{
                  components: {
                    Collapse: {
                      headerBg: "rgba(227, 112, 33,0.2)"

                    },
                  },
                }}
              >
                {!contract.object_constructions.length > 0 &&
                  <Title level={4} style={{ color: "#f00" }}>
                    Объектов не добавлено
                  </Title>
                }
                {contract.object_constructions.length > 0 &&
                  <Collapse items={
                    contract.object_constructions.map((obj) => ({

                      key: obj.id,
                      label: <><Text style={{ fontWeight: 600 }}>Наименование объекта:</Text> {obj.name}</>,
                      children: obj.steps.length === 0 ? (
                        <Title level={4} style={{ color: "#f00" }}>
                          Этапов не добавлено
                        </Title>
                      ) : (
                        <>
                          <Title level={4} >
                            Этапы:
                          </Title>
                          <ConfigProvider
                            theme={{
                              components: {
                                Collapse: {
                                  headerBg: "rgba(0,0,0,0.02)"

                                },
                              },
                            }}
                          >
                            <ViewSteps steps={obj.steps} update={() => { fetchData() }} />
                          </ConfigProvider>
                        </>
                      ),

                      // <Card key={obj.id} title={obj.name}>
                      // {obj.steps.length === 0 ? (
                      //   <Title level={4} style={{ color: "#f00" }}>
                      //       Этапов не добавлено
                      //     </Title>
                      //   ) : (
                      //     <ViewSteps steps={contract.steps} />
                      //   )}
                      //   </Card>
                    })
                    )}
                  />
                }
              </ConfigProvider>
            </Flex>
            }
            {!contract.overhaul && (contract.steps.length === 0 ? (
              <Title level={4} style={{ color: "#f00" }}>
                Этапов не добавлено
              </Title>
            ) : (
              <ViewSteps steps={contract.steps} update={() => { fetchData() }} />
            ))}

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