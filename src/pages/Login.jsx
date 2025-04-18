import React from 'react'
import { Flex } from 'antd'
import Title from 'antd/es/typography/Title'
import FormAuth from '../components/login/FormAuth'
import Container from '../components/Container'
import useAuth from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const navigate = useNavigate();
    const user = useAuth(store => store.user)
    if (user){
        if (user.role.type === 'admin' || user.role.type === 'readadmin') {
            return navigate('/admin')
        } else {
            return navigate('/dashboard')
        }
    }
        return (
            <Container>

                <Flex vertical justify='center' align='center' style={{ height: "50vh" }}>
                    {/* <Title style={{color:"#555",fontWeight:100,fontStyle:"italic",fontSize:48}}>Сервис по добавлению фотоотчетов</Title>  */}
                    {/* <Title>Сервис по добавлению фотоотчетов</Title> */}
                    <Title level={2} style={{color:"#555",fontWeight:100,fontStyle:"italic"}}>Сервис предоставления фотоотчетов</Title>
                    <FormAuth />
                </Flex>
            </Container>
        )
}
