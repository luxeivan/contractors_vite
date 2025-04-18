import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Outlet,
} from 'react-router-dom';
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Header from './components/headers/Header'
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import ContractItem from './pages/ContractItem';
import Footer from './components/footer/Footer';
import { Flex } from 'antd';


function App() {

  return (
    <>
      <Router>
        <Flex vertical style={{ minHeight: "100vh" }}>
          <div>
            <Header />
          </div>
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              {/* <Route path="/products" element={<Products />}>
            <Route index element={<ProductList />} />
            <Route path=":id" element={<ProductDetail />} />
            </Route> */}
              <Route path="/dashboard/contracts/:id" element={<ContractItem />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <div>
            <Footer />
          </div>
        </Flex>
      </Router>


    </>
  )
}

export default App
