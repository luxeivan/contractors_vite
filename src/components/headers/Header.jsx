import { Flex, Image } from 'antd'
import React, { useEffect, } from 'react'
import ButtonLogout from './ButtonLogout'
import Text from 'antd/es/typography/Text'
import ButtonBack from './ButtonBack'
import Container from '../Container'
import useAuth from '../../store/authStore'
// import logo from '../../img/logo_mosoblenergo.svg'
import logo from '../../img/MO_energo-logo-main.png'
import styles from './header.module.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { server } from '../../config'

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, getUser } = useAuth(store => store)
  useEffect(() => {
    if (location.pathname !== '/login' && !localStorage.getItem('jwt')) {
      navigate('/login')
    }
    getUser()
  }, [])
  return (
    <Container>
      <Flex vertical>
        <Flex justify='space-between' align='center' style={{ padding: 20, width: "100%" }} className={styles.topheader}>
          <Image src={logo} preview={false} width={300} />

          {user ?
            <Flex align='center' gap={20} justify='center'>
              <p >
                <Text style={{ fontSize: 20 }} type="secondary">Добро пожаловать </Text>
                <Text style={{ fontSize: 20 }}>{user.username}</Text>
              </p>
              <Link target='_blank' to={`${server}/uploads/Rukovodstvo_polzovatelya_servisa_fotootchety_v1_dbc578d635.pdf`}>
                <QuestionCircleOutlined style={{fontSize:20}}/>
              </Link>
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