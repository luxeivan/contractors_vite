import { getContractorItemForAdmin, updatePassword } from '../../lib/getData'
import { Descriptions, Flex, Modal, Spin, Button, Form, Input, Typography, notification } from 'antd'
import React, { useEffect, useState } from 'react'
import { passwordStrength } from 'check-password-strength'
import dayjs from 'dayjs'
// import { server } from "../../config";
const { Text } = Typography
const Context = React.createContext({ name: 'Default' });

export default function ModalViewContractor({ isOpenModal, closeModal, docIdForModal }) {
    const [formChangePassword] = Form.useForm()
    const [contractor, setContractor] = useState(null)
    const [loading, setLoading] = useState(true)
    const [openChangePassword, setOpenChangePassword] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)


    const [api, contextHolder] = notification.useNotification();
    const openNotification = () => {
        api.success({
            message: `Пароль изменен`,
            // description: 'This is the content of the notification. This is the content of the notification. This is the content of the notification.',
            placement: 'top',
        });
    };

    // console.log("contractor", contractor);
    const onFinish = async values => {
        try {

            setChangingPassword(true)
            // const newContractor = await addNewContractor(values)
            const newPass = await updatePassword(contractor.user.id, values.password)
            // console.log('newContractor:', newContractor);
            setChangingPassword(false)
            setOpenChangePassword(false)
            formChangePassword.resetFields()
            openNotification()
        } catch (error) {
            console.log('Ошибка замены пароля', error);
        }
        // router.refresh()
    };

    const fetching = async (idContract) => {
        try {
            setLoading(true)
            const temp = await getContractorItemForAdmin(idContract)
            // console.log("temp", temp)
            setContractor(temp)
            setLoading(false)
        } catch (error) {
            console.log(error);
        }

    }
    useEffect(() => {
        if (docIdForModal && isOpenModal === true) {
            fetching(docIdForModal)
        }
    }, [isOpenModal])
    let propertiesContractor = null
    if (contractor) {
        propertiesContractor = [
            {
                key: '1',
                label: 'Наименование',
                children: contractor.name,
            },
            {
                key: '2',
                label: 'ИНН-КПП',
                children: `${contractor.inn}-${contractor.kpp}`,
            },
            {
                key: '3',
                label: 'Создан',
                children: dayjs(contractor.createdAt).format('DD.MM.YYYY'),
            },

            // {
            //     key: '3',
            //     label: 'КПП',
            //     children: <span>{contractor.kpp}</span>,
            // },            
        ]
    }
    return (
        <Modal
            open={isOpenModal}
            onCancel={closeModal}
            title={!loading && contractor ? `Подрядчик ${contractor.name}` : 'Загрузка подрядчика...'}
            footer={false}
        >
            <Context.Provider >

                {contextHolder}
                {loading && <Flex justify='center'><Spin /></Flex>}
                {!loading && contractor &&
                    <Flex vertical gap={20}>
                        <Descriptions items={propertiesContractor} column={1} />
                        {/* {contractor.steps.length === 0 ? <Title level={4} style={{color:"#f00"}}>Этапов не добавлено</Title> : <ViewSteps steps={contractor.steps} />
                    } */}
                        <Button danger onClick={() => { setOpenChangePassword(!openChangePassword) }}>Сменить пароль пользователя</Button>

                        {openChangePassword &&
                            <Form
                                name="formAddContractor"
                                labelCol={{ span: 8 }}
                                wrapperCol={{ span: 16 }}
                                style={{ maxWidth: 600 }}
                                initialValues={{ remember: true }}
                                onFinish={onFinish}
                                form={formChangePassword}
                                // onFinishFailed={onFinishFailed}
                                autoComplete="off"
                            >
                                <Flex justify='end'>
                                    <Text style={{ color: "#999", fontSize: 10 }}>Пароль должен быть не менее 10 символов иметь заглавную букву и спецсимвол</Text>
                                </Flex>
                                <Form.Item
                                    label="Пароль"
                                    name="password"
                                    rules={[
                                        { required: true, message: 'Пожалуйста введите пароль.' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {

                                                if (passwordStrength(value).value === 'Medium' || passwordStrength(value).value === 'Strong') {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Пароль слишком слабый'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password />
                                </Form.Item>
                                <Form.Item
                                    label="Пароль еще раз"
                                    name="password2"
                                    dependencies={['password']}
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Пожалуйста повторите пароль.'
                                        },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('password') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Пароли не совпадают'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password />
                                </Form.Item>
                                <Form.Item label={null}>
                                    <Button type="primary" htmlType="submit">
                                        {changingPassword ? 'Изменяется...' : 'Изменить'}
                                    </Button>
                                </Form.Item>
                            </Form>

                        }
                    </Flex>
                }
            </Context.Provider>
        </Modal>
    )
}
