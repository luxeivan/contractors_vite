import React, { useEffect, useState } from 'react'
import Title from 'antd/es/typography/Title'
import { Card, Flex, Image } from 'antd'
import {Link} from 'react-router-dom'
import useDataDashboard from '../store/useDataDashboard'
import Container from '../components/Container'
export default function Admin() {
  const {myContractor, fetchMyContractor} = useDataDashboard(store=>store)

  useEffect(() => {
    fetchMyContractor()
  }, [])
  // const contractor = {contracts:[]}
  // console.log("myContractor", myContractor);
  return (
    <Container>
      {myContractor &&
        <>
          <Title level={2}>{myContractor.name}</Title>
          <Flex gap={20} style={{ padding: 20 }} wrap="wrap">
            {myContractor.contracts.map(item =>
              <Link key={item.id} to={`/dashboard/contracts/${item.documentId}`}>
                <Card hoverable title={'Договор №' + item.number} >
                  <Image src='https://infostart.ru/upload/iblock/d48/d489a1a6bb10747aa17e33be612ef5ff.png' preview={false} width={200} />
                </Card>
              </Link>
            )}
          </Flex>
        </>
      }
    </Container>
  )
}
