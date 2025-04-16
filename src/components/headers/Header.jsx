import { Flex, Image } from 'antd'
import React, { useEffect, } from 'react'
import ButtonLogout from './ButtonLogout'
import Text from 'antd/es/typography/Text'
import ButtonBack from './ButtonBack'
import Container from '../Container'
import useAuth from '../../store/authStore'
import logo from '../../img/logo_mosoblenergo.svg'

export default function Header() {
  const { user, getUser } = useAuth(store => store)
  useEffect(()=>{
    getUser()
  },[])
  return (
    <Container>
      <Flex vertical>
        <Flex justify='space-between' align='center' style={{padding:20}}>
          <Image src={logo} preview={false}/>
          
          {user ?
            <Flex align='center' gap={20}>
              <p >
                <Text style={{ fontSize: 20 }} type="secondary">Добро пожаловать </Text>
                <Text style={{ fontSize: 20 }}>{user.username}</Text>
              </p>
              <ButtonLogout />
            </Flex>
            :
            <div></div>
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