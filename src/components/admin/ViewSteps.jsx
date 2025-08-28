import { Collapse, Flex, Image, Button, Modal } from 'antd'
// import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import React, { useState } from 'react'
import dayjs from 'dayjs'
import { server } from "../../config";
import RenameStep from './RenameStep';
export default function ViewSteps({ steps, update }) {
    const [isOpenModalRename, setIsOpenModalRename] = useState(false)
    const items = steps.map((item, index) => (
        {
            key: index + 1,
            label: <Flex gap={30}><Text>{item.name}</Text><Text><span style={{ color: "gray" }}>Дата создания: {dayjs(item.createdAt).format('DD-MM-YYYY HH:mm')}</span></Text></Flex>,
            children: <Flex vertical gap={20}>
                <Flex justify='space-between' wrap={'wrap'}>
                    <p>{item.description}</p>
                    <Button onClick={() => {
                        console.log(item.documentId)
                        setIsOpenModalRename({ documentId: item.documentId, currentName: item.name, currentDescription: item.description })
                    }}>Переименовать этап</Button>
                </Flex>
                <Image.PreviewGroup>
                    <Flex gap={20} wrap={"wrap"}>
                        {item.photos?.map(item => <Image key={item.id} src={`${server}${item.url}`} width={200} />)}
                    </Flex>
                </Image.PreviewGroup>
            </Flex>,
        }
    ))
    return (
        <>
            <Collapse items={items} defaultActiveKey={[items.length]} />
            <Modal
                open={isOpenModalRename}
                destroyOnClose={true}
                footer={false}
                onCancel={() => { setIsOpenModalRename(false) }}
                title="Переименование этапа"
            >
                <RenameStep
                    documentId={isOpenModalRename.documentId}
                    currentName={isOpenModalRename.currentName}
                    currentDescription={isOpenModalRename.currentDescription}
                    closeModal={() => {
                        setIsOpenModalRename(false)
                        update()
                    }}
                />
            </Modal>
        </>
    )
}
