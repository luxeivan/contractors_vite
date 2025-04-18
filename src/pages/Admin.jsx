// import { cookies } from 'next/headers'
import React, { useEffect } from 'react'
import Title from 'antd/es/typography/Title'
// import axios from 'axios'
import { Tabs } from 'antd'
import TableContract from '../components/admin/TableContract'
import TableContractor from '../components/admin/TableContractor'
import Container from '../components/Container'
import useAuth from '../store/authStore'
import { Navigate, useNavigate } from 'react-router-dom'
// const server = process.env.SERVER_API
export default function Admin() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!localStorage.getItem('jwt')) {
      navigate('/login')
    }
  }, [])
  const items = [
    {
      key: '1',
      label: 'Договоры',
      children: <TableContract />,
    },
    {
      key: '2',
      label: 'Подрядчики',
      children: <TableContractor />,
    }
  ];
  // const jwt = (await cookies()).get('jwt')?.value || null   
  return (
    <Container>
      <Tabs defaultActiveKey="1" items={items} />
    </Container>
  )
}
