import { Collapse, Flex, Image, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import React, { useEffect } from "react";
import ButtonAddStep from "../components/dashboard/ButtonAddStep";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { server } from "../config";
import { useParams } from "react-router-dom";
import useDataDashboard from "../store/useDataDashboard";
import Container from "../components/Container";

export default function Contract({ params }) {
  const idContract = useParams().id;
  const { contract, fetchContract } = useDataDashboard((store) => store);
  const updateContract = () => {
    fetchContract(idContract);
  };
  useEffect(() => {
    fetchContract(idContract);
  }, []);

  // let contract = await getContractItem(idContract)
  // console.log("contract:", contract);
  const countSteps = contract?.steps?.length;
  const items = contract?.steps?.map((item, index) => ({
    key: index + 1,
    label: (
      <Flex gap={30}>
        <Text>{item.name}</Text>
        <Text>
          <span style={{ color: "gray" }}>
            Дата создания: {dayjs(item.createdAt).format("DD.MM.YYYY HH:mm")}
          </span>
        </Text>
      </Flex>
    ),
    children: (
      <Flex vertical gap={20}>
        <p>{item.description}</p>
        <Flex gap={20}>
          {item.photos?.map((item) => (
            <Image key={item.id} src={`${server}${item.url}`} width={200} />
          ))}
        </Flex>
      </Flex>
    ),
  }));

  return (
    <Container>
      {contract && (
        <>
          <Flex vertical>
            <Flex gap={10} align="baseline">
              <Title style={{ marginBottom: 0 }}>
                Договор №{contract.number}
              </Title>
              <Text
                style={{ color: "#888", fontStyle: "italic", fontSize: 18 }}
              >
                {" "}
                от {dayjs(contract.dateContract).format("DD.MM.YYYY")}
              </Text>
              <Flex>
                {contract.completed ? (
                  <Tag color={"volcano"}>Архивный</Tag>
                ) : (
                  <Tag color={"green"}>В работе</Tag>
                )}
                {contract.purpose && <Tag color={contract.purpose.color}>{contract.purpose.name}</Tag>}
              </Flex>
            </Flex>
            <Text
              style={{
                color: "#888",
                fontStyle: "italic",
                fontSize: 18,
                width: "50%",
                minWidth: 300,
              }}
            >
              {contract.description}
            </Text>
          </Flex>
          <Flex gap={20} vertical>
            <Flex
              justify={contract.document?.url ? "space-between" : "end"}
              align="center"
            >
              {contract.document?.url && (
                <Link target="_blank" to={`${server}${contract.document.url}`}>
                  <Text style={{ color: "blue" }}>Посмотреть договор</Text>
                </Link>
              )}
              <ButtonAddStep
                idContract={idContract}
                countSteps={countSteps}
                updateContract={updateContract}
                contractCompleted={contract.completed}
              />
            </Flex>
            <Collapse items={items} defaultActiveKey={[items.length]} />
          </Flex>
        </>
      )}
    </Container>
  );
}
