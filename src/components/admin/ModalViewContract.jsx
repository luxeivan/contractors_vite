import { getContractItem } from '../../lib/getData'
import { Descriptions, Flex, Modal, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import ViewSteps from './ViewSteps'
import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import { server } from "../../config";

export default function ModalViewContract({ isOpenModal, closeModal, docIdForModal }) {
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
                label: 'Описание',
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
                children: contract.document?<Link to={`${server}${contract.document.url}`} target='_blank'>{contract.document.name}</Link>:<Text style={{color:"#f00"}}>файл отсутствует</Text>,
            },
        ]
    }
    return (
        <Modal
            open={isOpenModal}
            onCancel={closeModal}
            title={!loading && contract ? `Договор№${contract.number}` : 'Загрузка договора...'}
            footer={false}
        >
            {loading && <Flex justify='center'><Spin /></Flex>}
            {!loading && contract &&
                <Flex vertical gap={20}>
                    <Descriptions items={propertiesContract} column={1} />
                    {contract.steps.length === 0 ? <Title level={4} style={{color:"#f00"}}>Этапов не добавлено</Title> : <ViewSteps steps={contract.steps} />
                    }
                </Flex>
            }
        </Modal>
    )
}
