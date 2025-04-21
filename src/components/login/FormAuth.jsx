import React, { useState } from 'react'
import { Form, Input, Button, Alert, Flex, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../store/authStore'
import styles from './formAuth.module.css'
export default function FormAuth() {
    const [errorAuth, setErrorAuth] = useState(false)
    const [auth, setAuth] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate();
    const { changeUserAndRole, getUser, login, user } = useAuth(store => store)


    async function onFinish(values) {
        try {
            setLoading(true)
            const res = await login(values.username, values.password)

            setLoading(false)
            if (res) {
                const user = await getUser()
                // console.log("user", user);
                // changeUserAndRole(user.username, user.role.type)
                setErrorAuth(false)
                if (user.role.type === 'admin' || user.role.type === 'readadmin') {
                    return navigate('/admin')
                } else {
                    return navigate('/dashboard')
                }
            } else {
                setErrorAuth(true)
                setAuth(false)
            }
            // Mutate data
        } catch (error) {
            setErrorAuth(true)
            console.log("error123", error);
            setLoading(false)
        }
    }

    const onFinishFailed = errorInfo => {
        console.log('Failed:', errorInfo);
    };
    const onClose = e => {
        setErrorAuth(false)
    };
    const onCloseAuth = e => {
        setAuth(false)
    };
    return (
        <>
            <Form
                name="auth"
                labelCol={{ span:  6}}
                wrapperCol={{ span: 18 }}
                // style={{ maxWidth: 1000, width: "30%", minWidth: 300 }}
                className={styles.form}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item
                    label="Пользователь"
                    name="username"
                    rules={[{ required: true, message: 'Пожалуйста введите пользователя' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Пароль"
                    name="password"
                    rules={[{ required: true, message: 'Пожалуйста введите пароль' }]}
                >
                    <Input.Password />
                </Form.Item>
                <Flex justify='end' style={{marginTop:-20,marginBottom:20}}>
                    <Typography.Text style={{ color: "#999", fontSize: 12 }}>Получить учетные данные можно у представителя компании</Typography.Text>
                </Flex>

                <Form.Item label={null}>
                    <Button type="primary" htmlType="submit" disabled={loading}>
                        Войти
                    </Button>
                </Form.Item>
            </Form>
            {errorAuth &&
                <Alert
                    message="Ошибка авторизации"
                    // description="Error Description Error Description Error Description Error Description Error Description Error Description"
                    type="error"
                    closable
                    onClose={onClose}
                />
            }
            {auth &&
                <Alert
                    message="Вы авторизированы"
                    description="Поздравляем"
                    type="success"
                    closable
                    onClose={onCloseAuth}
                />
            }
        </>
    )
}
