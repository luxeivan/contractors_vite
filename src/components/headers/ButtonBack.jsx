import { Button } from 'antd'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import useDataDashboard from '../../store/useDataDashboard';

export default function ButtonBack() {
    const{clearContract}=useDataDashboard(store=>store)
    const location = useLocation();
    const navigate = useNavigate();
    // const router = useRouter()
    // const pathname = usePathname()
    // console.log(location);
    

    if (location.pathname === '/dashboard' || location.pathname === '/admin'|| location.pathname === '/login'|| location.pathname === '/') return false
    return (
        <Button onClick={() => { 
            clearContract()
            navigate(-1) 
        }}>Назад</Button>
    )
}
