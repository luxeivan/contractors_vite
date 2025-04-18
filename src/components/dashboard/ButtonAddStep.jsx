import { UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Upload, Typography, Flex, Popconfirm } from 'antd'
import axios from 'axios';
import React, { useState } from 'react'
import { server } from '../../config';
const { Text } = Typography

// function getCookie(name) {
//     var matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
//     return matches ? decodeURIComponent(matches[1]) : undefined;
// }

export default function ButtonAddStep({ idContract, countSteps, updateContract }) {
    const [form] = Form.useForm();
    const jwt = localStorage.getItem('jwt')
    // console.log(countSteps);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    async function handleUpload(values) {
        // console.log("values", values)
        const formData = new FormData();
        fileList.forEach(file => {
            formData.append('files', file);
        });
        setUploading(true);
        try {
            const files = await axios.post(server + '/api/upload',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }

                })
            // console.log(files)
            if (files && files.data.length > 0) {
                const newStep = await axios.post(server + '/api/steps',
                    {
                        data: {
                            name: values.name,
                            contract: idContract,
                            // number: values.number,
                            description: values.description,
                            photos: files.data?.map(item => item.id)
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`
                        }

                    })
                if (newStep) {
                    // console.log("newStep", newStep);
                    setFileList([]);
                    setIsModalOpen(false);
                    form.resetFields()
                    updateContract()
                } else {
                    throw new Error('Ошибка добавления этапа')
                }
            } else {
                throw new Error('Ошибка загрузки файлов')
            }
            // message.success('upload successfully.');
        } catch (error) {
            console.log('Ошибка добавления этапа: ', error);
        }

        setUploading(false);
    };

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };
    const props = {
        onRemove: file => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: (file) => {
            // console.log("file", file);
            setFileList(prev => ([...prev, file]));
            return false;
        },
        fileList,
    };
    return (
        <>
            <Button type='primary' onClick={showModal}>Добавить выполненный этап</Button>
            <Modal title="Добавить выполненный этап" open={isModalOpen} onOk={handleOk} onCancel={handleCancel} footer={false}>
                <Form
                    form={form}
                    onFinish={handleUpload}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    style={{ maxWidth: 600 }}>
                    {/* <Form.Item
                        name='number'
                        label="Номер этапа"
                        required
                        initialValue={countSteps + 1}
                    >
                        <InputNumber />
                    </Form.Item> */}
                    <Form.Item
                        name='name'
                        label="Название этапа"
                        required
                        initialValue={`Этап №${countSteps + 1}`}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='description'
                        label="Описание"
                    >
                        <Input.TextArea />
                    </Form.Item>
                    <Flex justify='end'>
                        <Text style={{ color: "#999", fontSize: 12 }}>Размер файлов суммарно не должен превышать <span style={{ color: "#8f0000", fontWeight: 600 }}>20МБ</span></Text>
                    </Flex>
                    <Upload
                        {...props}
                        multiple
                        accept=".jpg,.jpeg,.png,.tiff"
                    >
                        <Button icon={<UploadOutlined />}>Выбрать фотографии</Button>
                    </Upload>
                    <Popconfirm
                        title="Добавить этап"
                        description={<Flex vertical>
                            <Text>Пожалуйста, проверьте внесенные данные!</Text>
                            <Text style={{ color: "#8f0000", fontWeight: 600 }}>После добавления изменить их нельзя.</Text> 
                            </Flex>}
                        onConfirm={() => {
                            form.submit()
                        }}
                        // onCancel={cancel}
                        okText="Добавить"
                        cancelText="Не добавлять"
                    >

                        <Button
                            type="primary"
                            // htmlType='submit'
                            disabled={fileList.length === 0}
                            loading={uploading}
                            style={{ marginTop: 16 }}
                        >
                            {uploading ? 'Добавляется...' : 'Добавить этап'}
                        </Button>
                    </Popconfirm>
                </Form>
            </Modal>
        </>
    )
}
