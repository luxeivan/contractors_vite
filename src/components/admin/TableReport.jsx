import React, { useEffect, useState } from 'react'
import useContractors from '../../store/useContractors'
import { Checkbox, Collapse, Flex, List, Spin, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import ModalViewContract from './ModalViewContract'

export default function TableReport() {
    const { contractors, find } = useContractors(store => store)
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [sortLastStep, setSortLastStep] = useState(false);
    const [docIdForModal, setDocIdForModal] = useState(null);
    useEffect(() => {
        find()
    }, [])
    console.log("contractors", contractors);

    const openModal = (docId) => {
        setDocIdForModal(docId);
        setIsOpenModal(true);
    };
    const closeModal = () => {
        setDocIdForModal(null);
        setIsOpenModal(false);
    };
    const items = contractors ? contractors.data.map((item, index) => {
        item.contractsLength = item.contracts.filter(item => item.purpose?.id != 49).length
        item.stepsLength = item.contracts.filter(item => item.purpose?.id != 49).reduce((accumulator, currentValue) => accumulator + currentValue.steps.length, 0)
        item.contractsNotSteps = item.contracts.filter(item => item.purpose?.id != 49).reduce((accumulator, currentValue) => {
            if (currentValue.steps.length == 0) {
                return accumulator + 1
            } else {
                return accumulator
            }
        }, 0)
        item.lastStepDate = dayjs(Math.max.apply(Math,
            item.contracts.filter(item => item.purpose?.id != 49).reduce((accumulator, currentValue) => accumulator.concat(currentValue.steps), [])
                .map(item => new Date(item.createdAt))))
        if (item.contractsLength) {
            return {
                key: index,
                label: <Flex gap={20}   >
                    <Typography.Text style={{ fontWeight: 700, }}>{item.name}</Typography.Text>
                    <Typography.Text>Договоров: <span style={{ fontWeight: 600, color: item.contractsLength == 0 ? "red" : undefined }}>{item.contractsLength}</span></Typography.Text>
                    <Typography.Text>Договоров без этапов: <span style={{ fontWeight: 600, color: item.contractsNotSteps > 0 ? "red" : undefined }}>{item.contractsNotSteps}</span></Typography.Text>
                    <Typography.Text>Всего этапов: <span style={{ fontWeight: 600, color: item.stepsLength == 0 ? "red" : undefined }}>{item.stepsLength}</span></Typography.Text>
                    {item.stepsLength > 0 &&
                        <Typography.Text>Последний этап был добавлен: {item.lastStepDate.format('DD.MM.YYYY HH:mm')}</Typography.Text>
                    }
                </Flex>,
                children: <>
                    <Typography.Title level={5}>Договоры:</Typography.Title>
                    <List
                        // header={<div>Header</div>}
                        // footer={<div>Footer</div>}
                        bordered
                        dataSource={item.contracts.filter(item => item.purpose?.id != 49)}
                        renderItem={item => {
                            const lastStep = dayjs(Math.max.apply(Math, item.steps.map(item => new Date(item.createdAt))))
                            console.log("lastStep", lastStep);

                            return <List.Item>
                                {/* <Typography.Text mark>[ITEM]</Typography.Text>  */}
                                <Flex gap={20}>
                                    <a onClick={() => { openModal(item.documentId) }}><Typography.Text style={{ color: "blue" }}>{item.number}</Typography.Text></a>
                                    <Typography.Text>Этапов в договоре: <span style={{ fontWeight: 600, color: item.steps.length == 0 ? "red" : undefined }}>{item.steps.length}</span></Typography.Text>
                                    <Typography.Text>Назначение: <Tag color={item.purpose.color}>{item.purpose.name}</Tag></Typography.Text>
                                    {item.steps.length>0 &&
                                        <Typography.Text>Последний этап добавлен: {lastStep.format('DD.MM.YYYY HH:mm')}</Typography.Text>
                                    }
                                </Flex>
                            </List.Item>

                        }
                        }
                    />
                </>,
                laststepdate: item.lastStepDate
            }
        } else {
            return false
        }
    }) : []
    return (
        <div>
            {items.length != 0 &&
                <Flex vertical gap={10} style={{ marginBottom: 20 }}>
                    <Typography.Text>Всего подрядчиков: {items?.filter(item => item).length}</Typography.Text>
                    <Typography.Text>Всего договоров (без кап. ремонта): {contractors?.data.reduce((acc, curr) => acc + curr.contracts.filter(item => item.purpose?.id != 49).length, 0)}</Typography.Text>
                    <Flex>
                        <Checkbox checked={sortLastStep} onChange={(e) => { setSortLastStep(e.target.checked) }}>Сортировать по дате последнего добавления этапа</Checkbox>
                    </Flex>
                </Flex>
            }
            <Collapse style={{ marginBottom: 20 }} items={items.sort((a, b) => {
                if (sortLastStep) {

                    console.log(isNaN(dayjs(b.laststepdate).unix()))
                    if (isNaN(a.laststepdate)) return 1;
                    if (isNaN(b.laststepdate)) return -1;
                    if (dayjs(a.laststepdate).unix() === dayjs(b.laststepdate).unix()) return 0;
                    return dayjs(a.laststepdate).unix() > dayjs(b.laststepdate).unix() ? -1 : 1;
                }

                // return !!a.laststepdate - !!b.laststepdate || dayjs(b.laststepdate).subtract(a.laststepdate).unix()
            }).filter(item => item)} />
            <ModalViewContract
                isOpenModal={isOpenModal}
                closeModal={closeModal}
                docIdForModal={docIdForModal}
            // update={handlerReload}
            />
            {items.length == 0 &&
                <Flex justify='center' style={{ margin: 40 }}>

                    <Spin size="large" />
                </Flex>
            }
        </div>
    )
}
