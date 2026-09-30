import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type FormState = {
  full_name: string
  email: string
  registration_number: string
  password: string
  confirm_password: string
}

const initialForm: FormState = {
  full_name: '',
  email: '',
  registration_number: '',
  password: '',
  confirm_password: '',
}

export default function Registration() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function getReadableError(detail: unknown): string {
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((item: any) => item?.msg || item).join(', ')
    return 'Unable to connect to the server.'
  }

  async function handleSubmit() {
    setError(null)

    if (!form.full_name.trim() || !form.email.trim() || !form.registration_number.trim()) {
      setError('Full name, email, and registration number are required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const regRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          registration_number: form.registration_number,
          password: form.password,
          confirm_password: form.confirm_password,
        }),
      })

      const regData = await regRes.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
      if (!regRes.ok) {
        throw new Error(getReadableError(regData.detail))
      }

      const loginRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })

      const loginData = await loginRes.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
      if (!loginRes.ok) {
        navigate('/login')
        return
      }

      localStorage.setItem('access_token', loginData.access_token)

      if (loginData.is_admin) {
        navigate('/admin')
      } else if (!loginData.has_enrolled) {
        navigate('/enroll')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(networkMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#1d2c29] bg-[#0d1715] shadow-2xl shadow-black/30">
        <div className="border-b border-[#1d2c29] px-6 py-4">
          <BackButton />
        </div>

        <div className="p-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Create your student account</h1>
          <p className="mb-6 text-sm text-[#d7c5b7]">Complete your profile below.</p>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#f7e9dd]">
              Full Name
              <input
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white"
                placeholder="Enter your full name"
              />
            </label>

            <label className="block text-sm font-medium text-[#f7e9dd]">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white"
                placeholder="student@university.edu"
              />
            </label>

            <label className="block text-sm font-medium text-[#f7e9dd]">
              Student Registration Number
              <input
                value={form.registration_number}
                onChange={(e) => updateField('registration_number', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white"
                placeholder="Enter your student registration number"
              />
            </label>

            <label className="block text-sm font-medium text-[#f7e9dd]">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white"
                placeholder="Create a password"
              />
            </label>

            <label className="block text-sm font-medium text-[#f7e9dd]">
              Confirm Password
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => updateField('confirm_password', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white"
                placeholder="Re-enter your password"
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#b95d1d] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#d36c2a]"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account / Sign Up'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-[#f7e9dd] underline hover:text-[#f7c593]"
            >
              Already have an account? Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
