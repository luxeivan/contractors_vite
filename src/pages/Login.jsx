import React from 'react'
import { Flex } from 'antd'
import Title from 'antd/es/typography/Title'
import FormAuth from '../components/login/FormAuth'
import Container from '../components/Container'

export default function Login() {
    return (
        <Container>

            <Flex vertical justify='center' align='center' style={{ height: "100vh" }}>
                <Title>Авторизация</Title>
                <FormAuth />
            </Flex>
        </Container>
    )
}
