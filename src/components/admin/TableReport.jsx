import React, { useEffect } from 'react'
import useContractors from '../../store/useContractors'
import { Collapse, Flex, List, Typography } from 'antd'
import dayjs from 'dayjs'

export default function TableReport() {
    const { contractors, find } = useContractors(store => store)
    useEffect(() => {
        find()
    }, [])
    console.log("contractors", contractors);

    const items = contractors ? contractors.data.map((item, index) => {
        item.contractsLength = item.contracts.filter(item => item.overhaul === false).length
        item.stepsLength = item.contracts.filter(item => item.overhaul === false).reduce((accumulator, currentValue) => accumulator + currentValue.steps.length, 0)
        item.contractsNotSteps = item.contracts.filter(item => item.overhaul === false).reduce((accumulator, currentValue) => {
            if (currentValue.steps.length == 0) {
                return accumulator + 1
            } else {
                return accumulator
            }
        }, 0)
        item.lastStepDate = dayjs(Math.max.apply(Math,
            item.contracts.filter(item => item.overhaul === false).reduce((accumulator, currentValue) => accumulator.concat(currentValue.steps), [])
                .map(item => new Date(item.createdAt))))

        return {
            key: item.id,
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
                    dataSource={item.contracts.filter(item => item.overhaul === false)}
                    renderItem={item => (
                        <List.Item>
                            {/* <Typography.Text mark>[ITEM]</Typography.Text>  */}
                            <Flex gap={20}>
                                <Typography.Text>{item.number}</Typography.Text>
                                <Typography.Text>Этапов в договоре: <span style={{ fontWeight: 600, color: item.steps.length == 0 ? "red" : undefined }}>{item.steps.length}</span></Typography.Text>
                            </Flex>
                        </List.Item>
                    )}
                />
            </>,
        }
    }) : false
    return (
        <div>
            <Flex vertical gap={10}>

            <Typography.Text>Всего подрядчиков: {contractors.data.length}</Typography.Text>
            <Typography.Text>Всего договоров (без кап. ремонта): {contractors.data.reduce((acc,curr)=>acc + curr.contracts.filter(item => item.overhaul === false).length, 0)}</Typography.Text>
            </Flex>
            <Collapse items={items} defaultActiveKey={['1']} />

        </div>
    )
}
