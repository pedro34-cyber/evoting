import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type SelectionMap = Record<number, number>

type CandidateMap = Record<number, { id: number; full_name?: string; name?: string }>

export default function Review() {
  const nav = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [positions, setPositions] = useState<{ id: number; name: string }[]>([])
  const [candidateMap, setCandidateMap] = useState<CandidateMap>({})
  const [electionId, setElectionId] = useState<number | null>(null)
  const [selections, setSelections] = useState<SelectionMap>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vote_selections') || '{}'
      const parsed = JSON.parse(stored) as SelectionMap
      setSelections(parsed)

      const election = Number(localStorage.getItem('vote_election_id') || '0')
      setElectionId(election || null)

      fetch((import.meta.env.VITE_API_URL || '') + `/api/elections/${election}`)
        .then(responseData)
        .then((data) => {
          if (!data || data.status !== 'active') throw new Error('This election is no longer active.')
          const nextPositions = (data.positions || []).map((position: any) => ({ id: position.id, name: position.name }))
          setPositions(nextPositions)
          const nextCandidates: CandidateMap = {}
          for (const position of data.positions || []) {
            for (const candidate of position.candidates || []) {
              nextCandidates[candidate.id] = candidate
            }
          }
          setCandidateMap(nextCandidates)
        })
        .catch(err => setError(networkMessage(err)))
    } catch {
      setError('Unable to load your ballot. Please return to the voting page.')
    }
  }, [])

  const [photo, setPhoto] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)
  async function cast() {
    setError(null)
    if (!electionId || !photo) { setError('Please upload or capture a face photo.'); return }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      const form = new FormData()
      form.append('file', photo)
      const authorization = await fetch((import.meta.env.VITE_API_URL || '') + `/api/elections/${electionId}/ballot/authorize`, {
        method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` },
      }).then(responseData)
      await fetch((import.meta.env.VITE_API_URL || '') + `/api/elections/${electionId}/ballot/cast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voting_token: authorization.voting_token, encrypted_ballot: btoa(JSON.stringify(selections)) }),
      }).then(responseData)
      localStorage.removeItem('vote_selections')
      localStorage.removeItem('vote_election_id')
      setSuccess(true)
    } catch (err) { setError(networkMessage(err)) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#1d2c29] bg-[#0d1715] shadow-2xl shadow-black/30">
        <div className="border-b border-[#1d2c29] px-6 py-4 flex items-center justify-between">
          <BackButton />
          <div className="text-sm font-semibold uppercase tracking-wider text-[#c88752]">Step 3: Review & Cast</div>
        </div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Review Your Selections</h1>
          <p className="text-sm text-[#d7c5b7] mb-8">Please double check your ballot. Casting your vote requires a final biometric authorization.</p>

          <div className="rounded-xl border border-[#213c36] bg-[#101d1b] p-6 mb-8">
            <div className="space-y-4">
              {positions.length === 0 ? (
                <div className="text-[#d7c5b7]">Your ballot is being loaded...</div>
              ) : (
                positions.map((position) => {
                  const candidateId = selections[position.id]
                  const candidate = candidateId ? candidateMap[candidateId] : null
                  return (
                    <div key={position.id} className="flex justify-between items-center border-b border-[#213c36] pb-3 last:border-0 last:pb-0">
                      <span className="text-[#d7c5b7] font-medium">{position.name}</span>
                      <span className="text-white font-bold bg-[#123c32] px-3 py-1 rounded-full text-sm">
                        {candidate ? (candidate.full_name || candidate.name || 'Candidate') : 'Not selected'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center">
            <div className="text-sm text-[#d7c5b7] mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8fe3b5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span>Final verification required to cast ballot</span>
            </div>
            {success ? <div role="status">Vote cast successfully. <button onClick={() => nav('/dashboard')}>Return to dashboard</button></div> : <label className="mb-4">Face photo for verification<input aria-label="Face photo for verification" type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={submitting} onChange={e => setPhoto(e.target.files?.[0] || null)} /></label>}
            <button onClick={cast} disabled={success || submitting || !electionId || !photo || !positions.length} className="w-full max-w-sm rounded-xl bg-[#123c32] px-6 py-4 font-bold text-white shadow-lg hover:bg-[#0d2a24] disabled:opacity-50">
              {submitting ? 'Authorizing & Casting...' : 'Cast Secure Vote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
