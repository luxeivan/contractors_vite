import { Button, Flex, Image } from 'antd'
import Title from "antd/es/typography/Title";
import { Link } from "react-router-dom";
import icon from '../img/logo_mosoblenergo.svg'
import useAuth from '../store/authStore';
import { useEffect } from 'react';

export default function Home() {
  const { user, getUser } = useAuth(store => store)
  useEffect(() => {
    getUser()
  }, [])
  console.log(user);
  
  return (
    <Flex vertical justify="center" align="center" style={{ height: "100vh" }} gap={20}>
      {/* <Title style={{margin:0}}>Мособлэнерго</Title> */}
      <Image src={icon.src} preview={false} />
      <Title level={2} style={{ margin: 0, color: "gray" }}>Приложение для подрядных организаций</Title>
      {user &&
        <p>{user.username}</p>
      }
      {!user &&
        
      <Link to='/login'><Button type="primary">Пройти аутентификацию</Button></Link>
      }
    </Flex>
  );
}
