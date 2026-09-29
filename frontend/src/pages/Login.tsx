import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export default function Login() {
  const [reg, setReg] = useState('')
  const [password, setPassword] = useState('')
  const nav = useNavigate()

  async function doLogin() {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_number: reg, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      localStorage.setItem('access_token', data.access_token)
      if (data.is_admin) {
        nav('/admin')
      } else {
        nav('/dashboard')
      }
    } catch (err: any) {
      alert('Login error: ' + err.message)
    }
  }

  function goRegister() {
    nav('/register')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-md rounded-2xl border border-[#1d2c29] bg-[#0d1715] p-6 shadow-2xl shadow-black/30">
        <div className="mb-4">
          <BackButton className="mb-4" />
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white">Student Login</h1>
        <div className="mb-3">
          <label className="mb-1 block text-sm text-[#d7c5b7]">Registration Number</label>
          <input
            value={reg}
            onChange={(e) => setReg(e.target.value)}
            className="w-full rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white placeholder:text-[#9db4ad]"
            placeholder="ADMIN001 or your reg number"
          />
        </div>
        <div className="mb-5">
          <label className="mb-1 block text-sm text-[#d7c5b7]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white placeholder:text-[#9db4ad]"
            placeholder="Enter your password"
          />
        </div>
        <div className="space-y-3">
          <button onClick={doLogin} className="w-full rounded-xl bg-[#b95d1d] px-4 py-3 font-semibold text-white hover:bg-[#d36c2a]">
            Login
          </button>
          <button onClick={goRegister} className="w-full rounded-xl border border-[#b95d1d] bg-transparent px-4 py-3 font-semibold text-[#f7c593] hover:bg-[#b95d1d]/10">
            Create Account / Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}
