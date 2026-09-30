import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nav = useNavigate()

  async function doLogin() {
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
      if (!res.ok) throw new Error(errorMessage(data.detail, 'Invalid email or password.'))
      localStorage.setItem('access_token', data.access_token)
      if (data.is_admin) {
        nav('/admin')
      } else if (!data.has_enrolled) {
        nav('/enroll')
      } else {
        nav('/dashboard')
      }
    } catch (err: any) {
      setError(networkMessage(err))
    } finally {
      setIsSubmitting(false)
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
          <label className="mb-1 block text-sm text-[#d7c5b7]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white placeholder:text-[#9db4ad]"
            placeholder="Enter your email address"
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

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button onClick={doLogin} disabled={isSubmitting} className="w-full rounded-xl bg-[#b95d1d] px-4 py-3 font-semibold text-white disabled:opacity-60 hover:bg-[#d36c2a]">
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
          <button onClick={goRegister} className="w-full rounded-xl border border-[#b95d1d] bg-transparent px-4 py-3 font-semibold text-[#f7c593] hover:bg-[#b95d1d]/10">
            Create Account / Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}
