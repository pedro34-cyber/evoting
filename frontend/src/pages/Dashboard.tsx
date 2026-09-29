import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type StudentProfile = {
  id: number
  full_name: string
  registration_number: string
  account_status?: string
  profile_image?: string
}

export default function Dashboard() {
  const nav = useNavigate()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      nav('/login')
      return
    }

    fetch((import.meta.env.VITE_API_URL || '') + '/api/student/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || 'Unable to load student profile.')
        }
        setStudent(data)
      })
      .catch((err: any) => {
        setError(err.message || 'Unable to load student profile.')
      })
  }, [nav])

  const profileImage = student?.profile_image || localStorage.getItem('profile_image') || 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#123c32"/>
      <circle cx="100" cy="72" r="42" fill="#f5efe8"/>
      <path d="M42 170c12-34 42-52 58-52s46 18 58 52" fill="#f5efe8"/>
    </svg>
  `)

  return (
    <div className="min-h-screen bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="mx-auto max-w-5xl rounded-3xl border border-[#1d2c29] bg-[#0d1715] p-6 shadow-2xl shadow-black/30">

        {/* Top header with app title and back button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-[#b95d1d] bg-[#123c32] flex items-center justify-center text-lg font-bold text-white">S</div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#c88752]">Student Union Government</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Election Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackButton label="Back" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Left profile column */}
          <div className="rounded-2xl border border-[#213c36] bg-[#101d1b] p-4">
            <div className="mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full border-2 border-[#b95d1d] bg-[#123c32] shadow-lg shadow-[#b95d1d]/10">
              <img src={profileImage} alt="Student profile" className="h-full w-full object-cover" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">{student?.full_name || 'Student'}</h2>
              <p className="text-sm text-[#d7c5b7]">{student?.registration_number || 'Registration pending'}</p>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-[#d7c5b7]">Account</div>
              <div className="rounded-lg bg-[#0d1715] px-3 py-2 text-sm">Status: <span className="font-semibold text-[#8fe3b5]">{student?.account_status || 'Active'}</span></div>
            </div>
          </div>

          {/* Right main column */}
          <div className="rounded-2xl border border-[#213c36] bg-[#101d1b] p-6">
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#213c36] pb-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#c88752]">Election</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">SUG General Election 2027</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#123c32] bg-[#123c32] px-3 py-1 text-xs font-semibold text-[#e8f2ef]">OPEN</span>
              </div>
            </div>

            {/* Stats cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#213c36] bg-[#0d1715] px-4 py-3">
                <div className="text-xs text-[#d7c5b7]">Registered Voters</div>
                <div className="mt-2 text-2xl font-bold text-white">1,254</div>
              </div>
              <div className="rounded-xl border border-[#213c36] bg-[#0d1715] px-4 py-3">
                <div className="text-xs text-[#d7c5b7]">Turnout</div>
                <div className="mt-2 text-2xl font-bold text-[#f7c593]">12%</div>
              </div>
              <div className="rounded-xl border border-[#213c36] bg-[#0d1715] px-4 py-3">
                <div className="text-xs text-[#d7c5b7]">Verification Pass Rate</div>
                <div className="mt-2 text-2xl font-bold text-[#8fe3b5]">96%</div>
              </div>
            </div>

            {/* Candidate list / quick vote area (placeholder data) */}
            <div className="rounded-xl border border-[#213c36] bg-[#0b1413] p-4">
              <h3 className="mb-3 text-lg font-semibold text-white">Candidates</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-[#213c36] bg-[#0d1715] px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">President — Candidate A</div>
                    <div className="text-xs text-[#d7c5b7]">Platform: Increase student welfare initiatives</div>
                  </div>
                  <button onClick={() => nav('/vote')} className="rounded-full bg-[#b95d1d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d36c2a]">Vote</button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#213c36] bg-[#0d1715] px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">Vice President — Candidate B</div>
                    <div className="text-xs text-[#d7c5b7]">Platform: Better campus safety</div>
                  </div>
                  <button onClick={() => nav('/vote')} className="rounded-full bg-[#b95d1d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d36c2a]">Vote</button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#213c36] bg-[#0d1715] px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">Secretary — Candidate C</div>
                    <div className="text-xs text-[#d7c5b7]">Platform: Improve record transparency</div>
                  </div>
                  <button onClick={() => nav('/vote')} className="rounded-full bg-[#b95d1d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d36c2a]">Vote</button>
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
              ) : null}

            </div>

            <div className="mt-6 flex items-center justify-end">
              <button onClick={() => nav('/verify-first')} className="rounded-xl bg-[#b95d1d] px-5 py-3 font-semibold text-white hover:bg-[#d36c2a]">
                Start Voting Flow
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
