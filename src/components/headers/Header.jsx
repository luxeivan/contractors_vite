import { Button, Flex, Image, Modal, Typography } from 'antd'
import React, { useEffect, useState, } from 'react'
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
import android from '../../img/android.svg'
import apple from '../../img/apple.svg'


export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false)
  const { user, role, getUser } = useAuth(store => store)

  const checkRole = async () => {
    if (location.pathname !== '/login' && !localStorage.getItem('jwt')) {
      return navigate('/login')
    }
    const user = await getUser()
    // console.log(user);

    if (location.pathname === '/dashboard' && (user?.role?.type === 'admin' || user?.role?.type === 'readadmin')) {
      return navigate('/admin')
    } else if (location.pathname === '/admin' && user?.role?.type === 'user') {
      return navigate('/dashboard')
    }
  }

  useEffect(() => {
    checkRole()
  }, [])
  return (
    <Container>
      <Flex vertical>
        <Flex justify='space-between' align='center' style={{ padding: 20, width: "100%" }} className={styles.topheader}>
          <Image src={logo} preview={false} width={300} />
          {user?.role?.type === 'user' &&
            <>
              <Text style={{ color: "#0958d9", cursor: "pointer" }} onClick={() => {
                setOpenModal(true)
              }}>Рекомендуемое приложение для фотографирования</Text>
              <Modal
                open={openModal}
                onCancel={() => { setOpenModal(false) }}
                title={"Рекомендуемое приложение для фотографирования"}
                footer={false}
                width={{ xxl: 1400 }}
              >
                <Flex align='center' justify='space-evenly' gap={30}>
                  <Flex align='center' justify='center' vertical >
                    <Typography.Title level={5}>Android</Typography.Title>
                    <Image src={android} preview={false} width={300} />
                    <Link to={'https://play.google.com/store/apps/details?id=com.jeyluta.timestampcamerafree'}>
                      <Button type='primary'>Установить</Button>
                    </Link>
                  </Flex>
                  <Flex align='center' justify='center' vertical >
                    <Typography.Title level={5}>Apple</Typography.Title>
                    <Image src={apple} preview={false} width={300} />
                    <Link to={'https://apps.apple.com/ru/app/timestamp-camera-basic/id840110184'}>
                      <Button type='primary'>Установить</Button>
                    </Link>
                  </Flex>
                </Flex>
              </Modal>
            </>
          }

          {user ?
            <Flex align='center' gap={20} justify='center'>
              <p >
                <Text style={{ fontSize: 20 }} type="secondary">Добро пожаловать </Text>
                <Text style={{ fontSize: 20 }}>{user.username}</Text>
              </p>
              <Link target='_blank' to={`${server}/uploads/Rukovodstvo_polzovatelya_servisa_fotootchety_v1_dbc578d635.pdf`}>
                <QuestionCircleOutlined style={{ fontSize: 20 }} />
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