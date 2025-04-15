import { Flex } from 'antd'
import React, { useEffect, useState } from 'react'
import ButtonLogout from './ButtonLogout'
import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import ButtonBack from './ButtonBack'
import Container from '../Container'
import useAuth from '../../store/authStore'

export default function Header() {
  const { user, getUser } = useAuth(store => store)
  useEffect(()=>{
    getUser()
  },[])
  // const user = await getUser()
  console.log("userHeader", user);

  return (
    <Container>
      <Flex vertical>
        <Flex justify='space-between' align='center'>
          <Title>Панель управления</Title>
          {user &&
            <Flex align='center' gap={20}>
              <p >
                <Text style={{ fontSize: 20 }} type="secondary">Добро пожаловать </Text>
                <Text style={{ fontSize: 20 }}>{user}</Text>
              </p>
              <ButtonLogout />
            </Flex>
          }
        </Flex>
        <Flex style={{ marginBottom: 20 }}>
          <ButtonBack />
        </Flex>
      </Flex>
    </Container>
  )
}

// import { Flex } from 'antd'
// import React from 'react'
// import { Link } from 'react-router-dom'
// import Container from '../Container'

// export default function Header() {
//   return (
//     <Container>

//     <Flex gap={20}>
//         <Link to={'/'}>Главная</Link>
//         <Link to={'/login'}>Авторизация</Link>
//         <Link to={'/admin'}>Админская</Link>
//         <Link to={'/dashboard'}>Пользовательская</Link>
//     </Flex>
//     </Container>
//   )
// }