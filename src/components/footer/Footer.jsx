import React from 'react'
import Container from '../Container'
import { Flex, Typography, Image } from 'antd'
import dayjs from 'dayjs'
import styles from './footer.module.css'
import lineBg from "../../img/line-bg.svg"
import substation from "../../img/substation-b-and-w.png"

export default function Footer() {
    return (
        <div 
        className={styles.footer} 
        style={{ backgroundImage: `url(${lineBg})` }}
        >
            <Container>
                <Flex align='center' justify='center' className={styles.footerFlex}>
                    <Flex gap={20}>
                    <Typography.Text style={{ color: "white" }}>АО «Мособлэнерго» - фотоотчеты</Typography.Text>
                    <Typography.Text style={{ color: "white" }}>|</Typography.Text>
                    <Typography.Text style={{ color: "white" }}>{dayjs().format("YYYY")}</Typography.Text>
                    </Flex>
                    <img src={substation} className={styles.fotograph}/>
                </Flex>
            </Container>
        </div>
    )
}
