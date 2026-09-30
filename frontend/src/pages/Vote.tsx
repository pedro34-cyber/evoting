import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type Candidate = { id: number; full_name?: string; name?: string; photo?: string; position_id: number; cgpa?: number; manifesto?: string }

type Position = { id: number; name: string; candidates?: Candidate[] }

type ActiveElection = { id: number; name: string; description?: string; status?: string; positions?: Position[] }

export default function Vote() {
  const [election, setElection] = useState<ActiveElection | null>(null)
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    async function loadElection() {
      try {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/elections/active')
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error('Unable to load active election.')
        setElection(data)
        setError(null)
      } catch (err: any) {
        setError(networkMessage(err))
        setElection(null)
      } finally {
        setLoading(false)
      }
    }

    loadElection()
    const interval = setInterval(loadElection, 1000)
    return () => clearInterval(interval)
  }, [])

  const positions = election?.positions || []

  function select(position_id: number, candidate_id: number) {
    setSelections((prev) => ({ ...prev, [position_id]: candidate_id }))
  }

  function goReview() {
    if (!election) {
      setError('No active election available.')
      return
    }

    for (const position of positions) {
      if (!(position.candidates || []).some(c => c.id === selections[position.id])) {
        setError('Please select a candidate for all positions before continuing.')
        return
      }
    }

    localStorage.setItem('vote_election_id', String(election.id))
    localStorage.setItem('vote_selections', JSON.stringify(Object.fromEntries(positions.map(p => [p.id, selections[p.id]]))))
    nav('/review')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#1d2c29] bg-[#0d1715] shadow-2xl shadow-black/30">
        <div className="border-b border-[#1d2c29] px-6 py-4 flex items-center justify-between">
          <BackButton />
          <div className="text-sm font-semibold uppercase tracking-wider text-[#c88752]">Step 2: Ballot</div>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{election?.name || 'Cast Your Vote'}</h1>
            <p className="text-sm text-[#d7c5b7]">Select one candidate for each position below.</p>
          </div>

          {loading ? (
            <div className="text-center py-10 text-[#d7c5b7]">Loading ballot...</div>
          ) : !election ? (
            <div className="rounded-xl border border-[#213c36] bg-[#101d1b] p-6 text-center text-[#d7c5b7]">No active election available.</div>
          ) : positions.length === 0 ? (
            <div className="rounded-xl border border-[#213c36] bg-[#101d1b] p-6 text-center text-[#d7c5b7]">No candidates have been added yet.</div>
          ) : (
            <div className="space-y-12">
              {positions.map((position) => (
                <div key={position.id} className="rounded-2xl border border-[#213c36] bg-[#101d1b] p-6 shadow-lg">
                  <div className="mb-6 border-b border-[#213c36] pb-3">
                    <h2 className="text-xl font-bold text-white tracking-wide uppercase">{position.name}</h2>
                  </div>

                  {!position.candidates?.length && <p>No candidates have been added yet.</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(position.candidates || []).map((candidate) => {
                      const isSelected = selections[position.id] === candidate.id
                      const label = candidate.full_name || candidate.name || 'Candidate'
                      return (
                        <div
                          key={candidate.id}
                          onClick={() => select(position.id, candidate.id)}
                          className={`cursor-pointer rounded-xl border p-6 flex flex-col items-center text-center transition-all duration-300 ${isSelected ? 'border-[#b95d1d] bg-[#b95d1d]/10 shadow-[0_0_15px_rgba(185,93,29,0.3)] scale-105' : 'border-[#27413b] bg-[#13221f] hover:border-[#b95d1d]/50 hover:bg-[#162b27]'}`}
                        >
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4 transition-colors ${isSelected ? 'bg-[#b95d1d] text-white shadow-lg' : 'bg-[#1d2c29] text-[#9db4ad]'}`}>
                            {label.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-white text-lg leading-tight">{label}</h3>
                          {candidate.photo ? <img src={candidate.photo.startsWith('http') ? candidate.photo : ((import.meta.env.VITE_API_URL || '') + candidate.photo)} alt={label} className="mt-4 h-16 w-16 rounded-full object-cover" /> : null}
                          <p>CGPA: {candidate.cgpa ?? '—'}</p><p>{candidate.manifesto}</p>
                          <div className="mt-5 flex items-center justify-center">
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#b95d1d]' : 'border-[#4a5f59]'}`}>
                              {isSelected && <div className="h-3 w-3 rounded-full bg-[#b95d1d]" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}

          <div className="mt-8 flex items-center justify-end border-t border-[#1d2c29] pt-6">
            <button onClick={goReview} className="rounded-xl bg-[#b95d1d] px-8 py-3 font-semibold text-white hover:bg-[#d36c2a] disabled:opacity-60" disabled={!election || positions.length === 0}>
              Review & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
