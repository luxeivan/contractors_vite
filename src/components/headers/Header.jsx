import { Button, Flex, Image, Modal, Typography, Tooltip } from "antd";
import React, { useEffect, useState } from "react";
import ButtonLogout from "./ButtonLogout";
import Text from "antd/es/typography/Text";
import ButtonBack from "./ButtonBack";
import Container from "../Container";
import useAuth from "../../store/authStore";
import logo from "../../img/MO_energo-logo-main.png";
import styles from "./header.module.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { server } from "../../config";
import android from "../../img/android.svg";
import apple from "../../img/apple.svg";

import { ExclamationCircleFilled } from "@ant-design/icons";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const { user, role, getUser } = useAuth((store) => store);

  const checkRole = async () => {
    if (location.pathname !== "/login" && !localStorage.getItem("jwt")) {
      return navigate("/login");
    }
    const user = await getUser();
    // console.log(user);

    if (
      location.pathname === "/dashboard" &&
      (user?.role?.type === "admin" || user?.role?.type === "readadmin")
    ) {
      return navigate("/admin");
    } else if (location.pathname === "/admin" && user?.role?.type === "user") {
      return navigate("/dashboard");
    }
  };

  useEffect(() => {
    checkRole();
  }, []);
  return (
    <Container>
      <Flex vertical>
        <Flex
          justify="space-between"
          align="center"
          style={{ padding: 20, width: "100%" }}
          className={styles.topheader}
        >
          <Link to={user?.role?.type === "user"?"/dashboard":"/admin"}>
          <Image src={logo} preview={false} width={300} />
          </Link>
          {user?.role?.type === "user" && (
            <>
              <Tooltip title="Приложение автоматически вставляет на фотографию текущее время и адрес">
                <Flex
                  align="center"
                  gap={6}
                  className={styles.appHint}
                  onClick={() => setOpenModal(true)}
                >
                  <ExclamationCircleFilled className={styles.alertIcon} />
                  <Text>Рекомендуемое приложение для фотографирования</Text>
                </Flex>
              </Tooltip>
              {/* <Text
                style={{ color: "#0958d9", cursor: "pointer" }}
                onClick={() => {
                  setOpenModal(true);
                }}
              >
                Рекомендуемое приложение для фотографирования
              </Text> */}
              <Modal
                open={openModal}
                onCancel={() => {
                  setOpenModal(false);
                }}
                title={"Рекомендуемое приложение для фотографирования"}
                footer={false}
                width={{ xxl: 1400 }}
              >
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginBottom: 20 }}
                >
                  Приложение автоматически вставляет на фотографию
                  текущее&nbsp;время и&nbsp;адрес
                </Typography.Paragraph>

                <Flex align="center" justify="space-evenly" gap={30}>
                  <Flex align="center" justify="center" vertical>
                    <Typography.Title level={5}>Android</Typography.Title>
                    <Image src={android} preview={false} width={300} />
                    <Link
                      to={
                        "https://play.google.com/store/apps/details?id=com.jeyluta.timestampcamerafree"
                      }
                    >
                      <Button type="primary">Установить</Button>
                    </Link>
                  </Flex>
                  <Flex align="center" justify="center" vertical>
                    <Typography.Title level={5}>Apple</Typography.Title>
                    <Image src={apple} preview={false} width={300} />
                    <Link
                      to={
                        "https://apps.apple.com/ru/app/timestamp-camera-basic/id840110184"
                      }
                    >
                      <Button type="primary">Установить</Button>
                    </Link>
                  </Flex>
                </Flex>
              </Modal>
            </>
          )}

          {user ? (
            <Flex align="center" gap={20} justify="center">
              <p>
                <Text style={{ fontSize: 20 }} type="secondary">
                  Добро пожаловать{" "}
                </Text>
                <Text style={{ fontSize: 20 }}>{user.username}</Text>
              </p>


              {user?.role?.type === "user" && (
                <Link
                  target="_blank"
                  to={`${server}/uploads/Rukovodstvo_polzovatelya_servisa_fotootchety_1508_01310226b4.pdf`}
                >
                  <QuestionCircleOutlined style={{ fontSize: 20 }} />
                </Link>
              )}
              {(user?.role?.type === "admin" || user?.role?.type === "readadmin") && (
                <Link
                  target="_blank"
                  to={`${server}/uploads/Rukovodstvo_administratora_servisa_1_607f666f57.pdf`}
                >
                  <QuestionCircleOutlined style={{ fontSize: 20 }} />
                </Link>
              )}

              <ButtonLogout />
            </Flex>
          ) : (
            <div></div>
          )}
        </Flex>
        <Flex style={{ marginBottom: 20 }}>
          <ButtonBack />
        </Flex>
      </Flex>
    </Container>
  );
}