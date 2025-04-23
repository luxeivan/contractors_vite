import React, { useEffect, useState } from 'react'
import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import { Card, Flex, Image, Select, Switch, Tag, Tooltip } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import useDataDashboard from '../store/useDataDashboard'
import Container from '../components/Container'
import dayjs from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons'
import { getAllPurposes } from '../lib/getData'
export default function Admin() {
  // const navigate = useNavigate();
  const { myContractor, fetchMyContractor } = useDataDashboard(store => store)
  const [onlyAtWork, setOnlyAtWork] = useState(0)
  const [allPurposes, setAllPurposes] = useState()
  const [selectedPurpose, setSelectedPurpose] = useState(null)
  const fetchPurposes = async () => {
    try {
      const res = await getAllPurposes(100, 1)
      // console.log(res);

      let temp = res?.data?.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      }).map(item => ({
        value: item.id, label: item.name
      }))
      temp.unshift({
        value: false, label: "Все"
      })
      setAllPurposes(temp)
    } catch (error) {
      console.log(error);
    }
  }
  useEffect(() => {
    // if (!localStorage.getItem('jwt')) {
    //   navigate('/login')
    // }
    fetchPurposes()
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
              {/* <Tooltip title="Обновить">
                <a onClick={() => { fetchMyContractor() }}><ReloadOutlined /></a>
              </Tooltip> */}
              <Flex gap={10} align='center'>
                <Text>Статус:</Text>
                <Select
                  defaultValue={0}
                  options={[
                    {
                      value: 0,
                      label: "Все",

                    },
                    {
                      value: 1,
                      label: "В работе"
                    },
                    {
                      value: 2,
                      label: "Архивный"
                    }
                  ]}
                  style={{ width: 150 }}
                  onChange={(value) => { setOnlyAtWork(value) }}
                />
              </Flex>
              <Flex gap={10} align='center'>
                <Text>Назначение:</Text>
                {allPurposes &&
                  <Select
                    defaultValue="Все"
                    style={{ width: 300 }}
                    onChange={(value) => {
                      setSelectedPurpose(value)
                    }}
                    options={allPurposes}
                  />
                }
              </Flex>
            </Flex>
          </Flex>
          <Flex gap={20} style={{ margin: "20px 0" }} wrap="wrap">

            {myContractor.contracts.filter(item => {
              if (onlyAtWork === 0) {
                return true
              }
              if (onlyAtWork === 1 && !item.completed) {
                return true
              } else if (onlyAtWork === 2 && item.completed) {
                return true
              } else {
                return false
              }


            }).filter(item => {
              if (selectedPurpose) {
                if (selectedPurpose === item.purpose?.id){
                  return true
                }else{
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
                          {item.purpose && <Tag color={item.purpose.color}>{item.purpose.name}</Tag>}
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
