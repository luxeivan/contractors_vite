import { Button } from 'antd'
import React from 'react'

import { useNavigate } from 'react-router-dom';
import useAuth from '../../store/authStore';

export default function ButtonLogout() {
    const {clearUserAndRole} = useAuth(store=>store)
    const navigate = useNavigate();
    const handlerClick = () => {
        // console.log(123);
        clearUserAndRole()
        localStorage.removeItem('jwt')
        navigate('/login')
    }
    return (
        <Button onClick={handlerClick}>Выйти</Button>
    )
}
