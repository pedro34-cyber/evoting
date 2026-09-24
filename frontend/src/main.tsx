import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Registration from './pages/Registration'
import Dashboard from './pages/Dashboard'
import VerifyFirst from './pages/VerifyFirst'
import Vote from './pages/Vote'
import Review from './pages/Review'
import Login from './pages/Login'

import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Registration/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/verify-first" element={<VerifyFirst/>} />
        <Route path="/vote" element={<Vote/>} />
        <Route path="/review" element={<Review/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
