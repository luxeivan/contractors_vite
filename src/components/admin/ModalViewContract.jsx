import {
  changePurposeInContract,
  completedContract,
  getAllPurposes,
  getContractItem,
} from "../../lib/getData";
import {
  Button,
  Descriptions,
  Flex,
  Form,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tag,
} from "antd";
import React, { useEffect, useState } from "react";
import ViewSteps from "./ViewSteps";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { server } from "../../config";
import useAuth from "../../store/authStore";

const fetchJSON = (url, opt = {}) =>
  fetch(url, opt).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || r.statusText);
    return j;
  });

async function logContractAction({ contractId, text }) {
  const jwt = localStorage.getItem("jwt") || "";
  const me = await fetchJSON(`${server}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  await fetchJSON(`${server}/api/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      data: { text, contract: contractId, author: me.id },
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
  const [contract, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState([]);
  const fetchPurposes = async () => {
    const allPurposes = await getAllPurposes(100, 1);
    // console.log("allContractors", allContractors)
    setPurpose(
      allPurposes.data.map((item) => ({
        value: item.id,
        label: item.name,
      }))
    );
  };
  // console.log(docIdForModal);

  const fetching = async (idContract) => {
    try {
      setLoading(true);
      const temp = await getContractItem(idContract);
      // console.log("temp", temp)
      setContracts(temp);
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (docIdForModal && isOpenModal === true) {
      fetching(docIdForModal);
      fetchPurposes();
    }
  }, [isOpenModal]);

  const handlerChangePurpose = async (newPurposeId) => {
    try {
      await changePurposeInContract(contract.documentId, newPurposeId);
      await logContractAction({
        contractId: contract.id,
        text: `📌 Назначение изменено на «${
          purpose.find((p) => p.value === newPurposeId)?.label ?? "—"
        }»`,
      });
      await fetching(docIdForModal);
      update();
    } catch (error) {
      console.log("error changePurpose:", error);
    }
  };

  let propertiesContract = null;

  if (contract) {
    propertiesContract = [
      // {
      //     key: '1',
      //     label: 'Номер',
      //     children: contract.number,
      // },
      {
        key: "4",
        label: "Дата договора",
        children: (
          <span>{dayjs(contract.dateContract).format("DD.MM.YYYY")}</span>
        ),
      },
      {
        key: "1",
        label: "Предмет договора",
        children: contract.description,
      },
      {
        key: "8",
        label: "Назначение",
        children: (
          <Flex>
            <Select
              onChange={handlerChangePurpose}
              style={{ minWidth: 300 }}
              options={purpose}
              defaultValue={contract.purpose?.id}
            />
          </Flex>
        ),
      },
      {
        key: "6",
        label: "Номер Тех.Задания",
        children: contract.numberTask,
      },
      {
        key: "2",
        label: "Подрядчик",
        children: contract.contractor.name,
      },
      {
        key: "3",
        label: "ИНН-КПП",
        children: (
          <span>
            {contract.contractor.inn}-{contract.contractor.kpp}
          </span>
        ),
      },
      // {
      //     key: '7',
      //     label: 'Комментарий',
      //     children: contract.comment,
      // },
      {
        key: "5",
        label: "Файл договора",
        children: contract.document ? (
          <Link to={`${server}${contract.document.url}`} target="_blank">
            {contract.document.name}
          </Link>
        ) : (
          <Text style={{ color: "#f00" }}>файл отсутствует</Text>
        ),
      },
    ];
  }

  const handlerComplete = async (documentIdContract) => {
    try {
      if (await completedContract(documentIdContract)) {
        await logContractAction({
          contractId: contract.id,
          text: "🗄️ Договор переведён в архив",
        });
        await fetching(documentIdContract);
      }
    } catch (error) {
      console.log("error completeContract:", error);
    }
  };

  // console.log("contract",contract);

  return (
    <Modal
      open={isOpenModal}
      onCancel={closeModal}
      title={
        !loading && contract ? (
          <Flex gap={20}>
            <Text style={{ fontSize: 16 }}>Договор№{contract.number} </Text>
            <Flex>
              {contract.completed ? (
                <Tag color={"volcano"}>Архивный</Tag>
              ) : (
                <Tag color={"green"}>В работе</Tag>
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
    >
      {loading && (
        <Flex justify="center">
          <Spin />
        </Flex>
      )}

      {!loading && contract && (
        <Flex vertical gap={20}>
          <Descriptions items={propertiesContract} column={1} bordered />
          {contract.steps.length === 0 ? (
            <Title level={4} style={{ color: "#f00" }}>
              Этапов не добавлено
            </Title>
          ) : (
            <ViewSteps steps={contract.steps} />
          )}
          {user?.role?.type !== "readadmin" && !contract.completed && (
            <Flex>
              <Popconfirm
                title="Добавить в архив"
                description="После добавления в архив пользователь не сможет добавлять этапы по договору"
                onConfirm={() => {
                  handlerComplete(contract.documentId);
                  update();
                }}
                // onCancel={cancel}
                okText="Добавить"
                cancelText="Не добавлять"
                okType="danger"
              >
                <Button
                  danger
                  // onClick={() => { handlerComplete(contract.documentId) }}
                >
                  Добавить в архив
                </Button>
              </Popconfirm>
            </Flex>
          )}
        </Flex>
      )}
    </Modal>
  );
}
