import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Registration from './pages/Registration'
import Dashboard from './pages/Dashboard'
import VerifyFirst from './pages/VerifyFirst'
import Vote from './pages/Vote'
import Review from './pages/Review'
import Login from './pages/Login'
import EnrollFace from './pages/EnrollFace'
import AdminDashboard from './pages/AdminDashboard'

import RequireAccount from './components/RequireAccount'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Registration/>} />
        <Route path="/enroll" element={<RequireAccount enrollment><EnrollFace/></RequireAccount>} />
        <Route path="/dashboard" element={<RequireAccount><Dashboard/></RequireAccount>} />
        <Route path="/verify-first" element={<RequireAccount><VerifyFirst/></RequireAccount>} />
        <Route path="/vote" element={<RequireAccount><Vote/></RequireAccount>} />
        <Route path="/review" element={<RequireAccount><Review/></RequireAccount>} />
        <Route path="/admin" element={<RequireAccount admin><AdminDashboard/></RequireAccount>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
