import React from 'react'
import { Flex } from 'antd'
import Title from 'antd/es/typography/Title'
import FormAuth from '../components/login/FormAuth'
import Container from '../components/Container'

export default function Login() {
    return (
        <Container>

            <Flex vertical justify='center' align='center' style={{height:"50vh"}}>
                {/* <Title style={{color:"#555",fontWeight:100,fontStyle:"italic",fontSize:48}}>Сервис по добавлению фотоотчетов</Title>  */}
                {/* <Title>Сервис по добавлению фотоотчетов</Title> */}
                <Title level={2}>Авторизация</Title>
                <FormAuth />
            </Flex>
        </Container>
    )
}
