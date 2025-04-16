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


function App() {
  
  return (
    <>
      <Router>
        <Header />
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
      </Router>


    </>
  )
}

export default App
