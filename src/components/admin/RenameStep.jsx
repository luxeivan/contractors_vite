import { Button, Flex, Input, Typography } from 'antd'
import React, { useState } from 'react'
import { renameStep } from "../../lib/getData";

export default function RenameStep({ documentId, currentName, currentDescription, closeModal }) {
    const [newName, setNewName] = useState(currentName)
    const [newDescription, setNewDescription] = useState(currentDescription)
    const handlerRename = async () => {
        if (await renameStep(documentId, newName, newDescription)) {
            closeModal()
        } else {
            closeModal()
            console.log("Чтото пошло не так при переименовании этапа");
        }
    }
    return (
        <Flex vertical gap={20}>
            <Flex gap={1} vertical>
                <Typography.Text>Имя:</Typography.Text>
                <Input.TextArea
                    value={newName}
                    onChange={(event) => {
                        setNewName(event.target.value)
                    }}
                />
            </Flex>
            <Flex gap={1} vertical>
                <Typography.Text>Описание:</Typography.Text>
                <Input.TextArea
                    value={newDescription}
                    onChange={(event) => {
                        setNewDescription(event.target.value)
                    }}
                />
            </Flex>
            <Flex wrap='wrap' gap={10}>

                <Button type='primary' onClick={handlerRename}>Переименовать</Button>
                <Button onClick={() => {
                    closeModal()
                }}>Отмена</Button>
            </Flex>
        </Flex>
    )
}
