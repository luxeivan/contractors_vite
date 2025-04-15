import { getContractorItemForAdmin } from '../../lib/getData'
import { Descriptions, Flex, Modal, Spin } from 'antd'
import React, { useEffect, useState } from 'react'

import { server } from "../../config";

export default function ModalViewContractor({ isOpenModal, closeModal, docIdForModal }) {
    const [contractor, setContractor] = useState(null)
    const [loading, setLoading] = useState(true)
    // console.log(docIdForModal);

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
            {loading && <Flex justify='center'><Spin /></Flex>}
            {!loading && contractor &&
                <Flex vertical gap={20}>
                    <Descriptions items={propertiesContractor} column={1} />
                    {/* {contractor.steps.length === 0 ? <Title level={4} style={{color:"#f00"}}>Этапов не добавлено</Title> : <ViewSteps steps={contractor.steps} />
                    } */}
                </Flex>
            }
        </Modal>
    )
}
