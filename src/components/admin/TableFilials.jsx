import React, { useEffect, useState } from 'react'
import Container from '../Container'
import useFilials from '../../store/useFilials'
import { Button, Flex, Form, Input, Modal, Select, Space, Table, Tag, Tooltip } from 'antd'
import useAuth from '../../store/authStore'
import { ReloadOutlined } from '@ant-design/icons'
const options = [
    {
        value: "magenta",
        label: <Tag color='magenta'>magenta</Tag>
    },
    {
        value: "red",
        label: <Tag color='red'>red</Tag>
    },
    {
        value: "volcano",
        label: <Tag color='volcano'>volcano</Tag>
    },
    {
        value: "orange",
        label: <Tag color='orange'>orange</Tag>
    },
    {
        value: "gold",
        label: <Tag color='gold'>gold</Tag>
    },
    {
        value: "lime",
        label: <Tag color='lime'>lime</Tag>
    },
    {
        value: "green",
        label: <Tag color='green'>green</Tag>
    },
    {
        value: "cyan",
        label: <Tag color='cyan'>cyan</Tag>
    },
    {
        value: "blue",
        label: <Tag color='blue'>blue</Tag>
    },
    {
        value: "geekblue",
        label: <Tag color='geekblue'>geekblue</Tag>
    },
    {
        value: "purple",
        label: <Tag color='purple'>purple</Tag>
    },
]
export default function TableFilial() {
    const [form] = Form.useForm()
    const { user } = useAuth(store => store)
    const { filials, find, update, create } = useFilials(store => store)
    const [isOpenEditModal, setIsOpenEditModal] = useState(false)
    const [loadingFilials, setLoadingFilials] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isOpenAddModal, setIsOpenAddModal] = useState(false)
    const [loadingAdd, setLoadingAdd] = useState(false)

    const fetchFilials = async () => {
        setLoadingFilials(true)
        await find()
        setLoadingFilials(false)
    }

    useEffect(() => {
        fetchFilials()
    }, [])

    const handlerReload = (record) => {
        fetchFilials()
    }
    const openModal = (record) => {
        form.setFieldValue('name', record.name)
        form.setFieldValue('color', record.color)
        setIsOpenEditModal(record)
    }
    const openModalAdd = (record) => {
        setIsOpenAddModal(record)
    }

    const columns = [
        {
            title: 'Наименование',
            dataIndex: 'name',
            key: 'name',
            render: name => <span>{name}</span>,
        },
        {
            title: 'Цвет',
            dataIndex: 'color',
            key: 'color',
            render: color => <Tag color={color}>{color}</Tag>,
        },
        {
            title: 'Действия',
            key: 'action',
            render: (record) => (
                <Space size="middle">
                    <a onClick={() => { openModal(record) }}>Редактировать</a>
                </Space>
            ),
        },
    ]
    const data = filials?.data?.map(item => ({
        key: item.id,
        name: item.name,
        color: item.color,
        documentId: item.documentId
    }))

    const handlerAddNewFilial = async (values) => {
        setLoadingAdd(true)
        await create(values)
        setLoadingAdd(false)
        setIsOpenAddModal(false)

    }
    const handlerEditFilial = async (values) => {

        setLoading(true)
        await update(isOpenEditModal.documentId, values)
        setLoading(false)
        setIsOpenEditModal(false)
    }

    // console.log(purposes);

    return (
        <>
            <Container>
                <Flex justify='end' style={{ marginBottom: 20 }} gap={20} align='center'>
                    <Tooltip title="Обновить">
                        <a onClick={handlerReload}><ReloadOutlined /></a>
                    </Tooltip>
                    {user?.role?.type !== "readadmin" &&
                        <Button onClick={openModalAdd} type='primary'>Добавить новый филиал</Button>
                    }
                </Flex>
                <Table columns={columns} dataSource={data} loading={loadingFilials}/>

            </Container>
            <Modal
                open={isOpenEditModal}
                onCancel={() => { setIsOpenEditModal(false) }}
                title='Редактирование'
                footer={false}
            >
                <Form
                    form={form}
                    onFinish={handlerEditFilial}
                >
                    <Form.Item
                        name='name'
                        label="Наименование"
                    // initialValue={isOpenEditModal.name}
                    >
                        <Input
                        // defaultValue={isOpenEditModal.name}
                        />
                    </Form.Item>
                    <Form.Item
                        name='color'
                        label="Цвет"
                    // initialValue={isOpenEditModal.color}
                    >
                        <Select
                            options={options}
                        // defaultValue={isOpenEditModal.color}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type='primary' htmlType='submit' disabled={loading}>{loading ? 'Изменяется...' : 'Изменить'}</Button>
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                open={isOpenAddModal}
                onCancel={() => { setIsOpenAddModal(false) }}
                title='Добавление'
                footer={false}
            >
                <Form
                    onFinish={handlerAddNewFilial}
                >
                    <Form.Item
                        name='name'
                        label="Наименование"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='color'
                        label="Цвет"
                    >
                        <Select
                            options={options}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type='primary' htmlType='submit' disabled={loadingAdd}>{loadingAdd ? 'Добавляется...' : 'Добавить'}</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    )
}
