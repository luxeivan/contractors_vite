import { Collapse,Flex,Image} from 'antd'
import Title from 'antd/es/typography/Title'
import Text from 'antd/es/typography/Text'
import React from 'react'
import dayjs from 'dayjs'
import { server } from "../../config";
export default function ViewSteps({steps}) {
    const items = steps.map((item, index) => (
        {
            key: index + 1,
            label: <Flex gap={30}><Text>{item.name}</Text><Text><span style={{ color: "gray" }}>Дата создания: {dayjs(item.createdAt).format('DD-MM-YYYY HH:mm')}</span></Text></Flex>,
            children: <Flex vertical gap={20}>
                <p>{item.description}</p>
                <Flex gap={20}>
                    {item.photos?.map(item => <Image key={item.id} src={`${server}${item.url}`} width={200} />)}
                </Flex>
            </Flex>,
        }
    ))
  return (
    <Collapse items={items} defaultActiveKey={[items.length]} />
  )
}
