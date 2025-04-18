import { completedContract, getContractItem } from '../../lib/getData'
import { Button, Descriptions, Flex, Modal, Popconfirm, Spin, Tag } from 'antd'
import React, { useEffect, useState } from 'react'
import ViewSteps from './ViewSteps'
import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import { server } from "../../config";
import useAuth from '../../store/authStore'

export default function ModalViewContract({ isOpenModal, closeModal, docIdForModal,update }) {
    const { user } = useAuth(store => store)
    const [contract, setContracts] = useState(null)
    const [loading, setLoading] = useState(true)
    // console.log(docIdForModal);

    const fetching = async (idContract) => {
        try {
            setLoading(true)
            const temp = await getContractItem(idContract)
            // console.log("temp", temp)
            setContracts(temp)
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
    let propertiesContract = null
    if (contract) {
        propertiesContract = [
            // {
            //     key: '1',
            //     label: 'Номер',
            //     children: contract.number,
            // },
            {
                key: '4',
                label: 'Дата договора',
                children: <span>{dayjs(contract.dateContract).format('DD.MM.YYYY HH:mm')}</span>,
            },
            {
                key: '1',
                label: 'Предмет договора',
                children: contract.description,
            },
            {
                key: '2',
                label: 'Подрядчик',
                children: contract.contractor.name,
            },
            {
                key: '3',
                label: 'ИНН-КПП',
                children: <span>{contract.contractor.inn}-{contract.contractor.kpp}</span>,
            },
            {
                key: '5',
                label: 'Файл договора',
                children: contract.document ? <Link to={`${server}${contract.document.url}`} target='_blank'>{contract.document.name}</Link> : <Text style={{ color: "#f00" }}>файл отсутствует</Text>,
            },
        ]
    }
    const handlerComplete = async (documentIdContract) => {
        if (await completedContract(documentIdContract)) {
            await fetching(documentIdContract)
        }
    }
    return (
        <Modal
            open={isOpenModal}
            onCancel={closeModal}
            title={!loading && contract ? <Flex gap={20}>
                <Text style={{ fontSize: 16 }}>Договор№{contract.number}  </Text>
                <Flex>
                    {contract.completed ? <Tag color={"volcano"}>Архивный</Tag> : <Tag color={"green"}>В работе</Tag>}
                    {contract.social && <Tag color={"blue"}>Социальный</Tag>}
                </Flex>
            </Flex>
                : 'Загрузка договора...'}
            footer={false}
        >
            {loading && <Flex justify='center'><Spin /></Flex>}

            {!loading && contract &&
                <Flex vertical gap={20}>
                    <Descriptions items={propertiesContract} column={1} />
                    {contract.steps.length === 0 ? <Title level={4} style={{ color: "#f00" }}>Этапов не добавлено</Title> : <ViewSteps steps={contract.steps} />}
                    {user?.role?.type !== "readadmin" && !contract.completed &&
                        <Popconfirm
                            title="Добавить в архив"
                            description="После добавления в архив пользователь не сможет добавлять этапы по договору"
                            onConfirm={() => { 
                                handlerComplete(contract.documentId) 
                                update()
                            }}
                            // onCancel={cancel}
                            okText="Добавить"
                            cancelText="Не добавлять"
                        >

                            <Button 
                            danger 
                            // onClick={() => { handlerComplete(contract.documentId) }}
                            >Добавить в архив</Button>
                        </Popconfirm>
                    }
                </Flex>
            }
        </Modal>
    )
}
