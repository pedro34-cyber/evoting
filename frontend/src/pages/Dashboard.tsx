import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type StudentProfile = {
  id: number
  full_name: string
  email?: string
  registration_number: string
  account_status?: string
  profile_image?: string
  has_enrolled?: boolean
}

type Candidate = {
  id: number
  full_name?: string
  name?: string
  photo?: string
  manifesto?: string
  cgpa?: number
}

type Position = {
  id: number
  name: string
  candidates?: Candidate[]
}

type Election = {
  id: number
  name: string
  description?: string
  status?: string
  positions?: Position[]
}

export default function Dashboard() {
  const nav = useNavigate()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [election, setElection] = useState<Election | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const safeImageUrl = (path?: string) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    return `${base}${path}`
  }

  async function loadDashboardData() {
    const token = localStorage.getItem('access_token')
    if (!token) {
      nav('/login')
      return
    }

    try {
      const [profileRes, electionRes] = await Promise.all([
        fetch((import.meta.env.VITE_API_URL || '') + '/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch((import.meta.env.VITE_API_URL || '') + '/api/elections/active'),
      ])

      const profileData = await profileRes.json().catch(() => ({ detail: 'Unable to load student profile.' }))
      if (!profileRes.ok) throw new Error(profileData.detail || 'Unable to load student profile.')
      if (!profileData.has_enrolled) { nav('/enroll'); return }
      setStudent(profileData)

      const electionData = await electionRes.json().catch(() => null)
      if (electionRes.ok) {
        setElection(electionData)
      } else {
        throw new Error("Unable to load election information. Please try again.")
      }
      setError(null)
    } catch (err: any) {
      setError(networkMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 1000)
    return () => clearInterval(interval)
  }, [nav])

  const profileImage = student?.profile_image || 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#123c32"/>
      <circle cx="100" cy="72" r="42" fill="#f5efe8"/>
      <path d="M42 170c12-34 42-52 58-52s46 18 58 52" fill="#f5efe8"/>
    </svg>
  `)

  const positions = election?.positions || []

  return (
    <div className="min-h-screen bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="mx-auto max-w-5xl rounded-3xl border border-[#1d2c29] bg-[#0d1715] p-6 shadow-2xl shadow-black/30">
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
              <div className="rounded-lg bg-[#0d1715] px-3 py-2 text-sm">Status: <span className="font-semibold text-[#8fe3b5]">{student?.account_status || '—'}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#213c36] bg-[#101d1b] p-6">
            {loading ? (
              <div className="py-8 text-center text-[#d7c5b7]">Loading election details...</div>
            ) : !election ? (
              <div className="py-8 text-center text-[#d7c5b7]">No active election available.</div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#213c36] pb-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#c88752]">Election</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{election.name}</h2>
                    {election.description && <p className="mt-2 text-sm text-[#d7c5b7]">{election.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-[#123c32] bg-[#123c32] px-3 py-1 text-xs font-semibold text-[#e8f2ef] uppercase">
                      {election.status || 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  {positions.length === 0 ? (
                    <div className="rounded-xl border border-[#213c36] bg-[#0b1413] p-4 text-[#d7c5b7]">No candidates have been added yet.</div>
                  ) : (
                    positions.map((position) => {
                      const candidates = position.candidates || []
                      return (
                        <div key={position.id} className="rounded-xl border border-[#213c36] bg-[#0b1413] p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold uppercase text-white">{position.name}</h3>
                            <button onClick={() => nav('/vote')} className="rounded-full bg-[#b95d1d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d36c2a]">Vote</button>
                          </div>

                          {candidates.length === 0 ? (
                            <div className="text-[#d7c5b7]">No candidates have been added yet.</div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              {candidates.map((candidate) => (
                                <div key={candidate.id} className="rounded-xl border border-[#213c36] bg-[#0d1715] p-4">
                                  <div className="mb-3 flex items-center gap-4">
                                    <img
                                      src={safeImageUrl(candidate.photo) || 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#123c32"/><circle cx="60" cy="40" r="24" fill="#f5efe8"/><path d="M18 100c8-18 24-28 42-28s34 10 42 28" fill="#f5efe8"/></svg>`) }
                                      alt={candidate.full_name || candidate.name || 'Candidate'}
                                      className="h-20 w-20 rounded-full object-cover border border-[#b95d1d]"
                                    />
                                    <div>
                                      <div className="text-lg font-bold text-white">{candidate.full_name || candidate.name || 'Candidate'}</div>
                                      <div className="text-sm text-[#d7c5b7]">CGPA: {candidate.cgpa ?? 'N/A'}</div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-[#d7c5b7] whitespace-pre-line">
                                    {candidate.manifesto ? `Manifesto:\n${candidate.manifesto}` : 'No manifesto provided.'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end">
                  <button onClick={() => nav('/verify-first')} className="rounded-xl bg-[#b95d1d] px-5 py-3 font-semibold text-white hover:bg-[#d36c2a]">
                    Start Voting Flow
                  </button>
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
