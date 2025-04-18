import React, { useEffect, useState } from 'react'
import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import { Card, Flex, Image,  Switch, Tag, Tooltip } from 'antd'
import { Link } from 'react-router-dom'
import useDataDashboard from '../store/useDataDashboard'
import Container from '../components/Container'
import dayjs from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons'
export default function Admin() {
  const { myContractor, fetchMyContractor } = useDataDashboard(store => store)
  const [onlyAtWork, setOnlyAtWork] = useState(false)
  const [onlySocial, setOnlySocial] = useState(false)

  useEffect(() => {
    fetchMyContractor()
  }, [])
  // const contractor = {contracts:[]}
  // console.log("myContractor", myContractor);
  return (
    <Container>
      {myContractor &&
        <>
          <Title level={2} style={{ marginBottom: 5 }}>{myContractor.name}</Title>
          <div>
            <Text style={{ color: "#555", fontStyle: "italic" }}>ИНН: {myContractor.inn} КПП: {myContractor.kpp}</Text>
          </div>
          <Flex justify='space-between' align='center' style={{ margin: "20px 0" }}>
            <Flex gap={20}>
              <Tooltip title="Обновить">
                <a onClick={() => { fetchMyContractor() }}><ReloadOutlined /></a>
              </Tooltip>
              <Flex gap={10}>
                <Text>В работе:</Text>
                <Switch onChange={() => { setOnlyAtWork(!onlyAtWork) }} />
              </Flex>
              <Flex gap={10}>
                <Text>Социальные объекты:</Text>
                <Switch onChange={() => { setOnlySocial(!onlySocial) }} />
              </Flex>
            </Flex>
          </Flex>
          <Flex gap={20} style={{ margin: "20px 0" }} wrap="wrap">
            {myContractor.contracts.filter(item => {
              if (onlyAtWork) {
                if (item.completed) {
                  return false
                } else {
                  return true
                }
              } else {
                return true
              }
            }).filter(item => {
              if (onlySocial) {
                if (item.social) {
                  return true
                } else {
                  return false
                }
              } else {
                return true
              }
            }).sort((a, b) => new Date(b.dateContract) - new Date(a.dateContract))
              .map(item =>
                <Link key={item.id} to={`/dashboard/contracts/${item.documentId}`}>
                  <Card
                    hoverable
                    title={
                      <Flex gap={20}>
                        <Flex gap={5}>
                          <Text>Договор №{item.number}</Text>
                          <Text style={{ color: "#888", fontStyle: "italic" }}> от {dayjs(item.dateContract).format('DD.MM.YYYY')}</Text>
                        </Flex>
                        <Flex>
                          {item.completed ? <Tag color={"volcano"}>Архивный</Tag> : <Tag color={"green"}>В работе</Tag>}
                          {item.social && <Tag color={"blue"}>Социальный</Tag>}
                        </Flex>
                      </Flex>
                    }>
                    <Flex vertical align='center'>

                      <Text style={{ maxWidth: 400 }}>{item.description}</Text>
                      <Image src='https://infostart.ru/upload/iblock/d48/d489a1a6bb10747aa17e33be612ef5ff.png' preview={false} width={100} />
                    </Flex>
                  </Card>
                </Link>
              )}
          </Flex>
        </>
      }
    </Container>
  )
}
