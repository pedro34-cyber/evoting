import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Users, Activity, CheckCircle, Clock, BarChart3, Settings, ShieldAlert, CheckSquare } from 'lucide-react'

type Tab = 'overview' | 'elections' | 'voters' | 'results' | 'system'

type Election = {
  id: number
  name: string
  description?: string
  status?: string
  positions?: any[]
}

type Voter = {
  id: number
  full_name: string
  email?: string
  registration_number: string
  account_status: string
  is_admin: boolean
  has_enrolled: boolean
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [elections, setElections] = useState<Election[]>([])
  const [voters, setVoters] = useState<Voter[]>([])
  const [overview, setOverview] = useState<any>(null)
  const [sysStatus, setSysStatus] = useState<any>(null)
  const [results, setResults] = useState<any>(null)
  const [selectedElection, setSelectedElection] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [electionName, setElectionName] = useState('')
  const [electionDescription, setElectionDescription] = useState('')
  const [positionName, setPositionName] = useState('')
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null)
  const [candidateName, setCandidateName] = useState('')
  const [candidateCgpa, setCandidateCgpa] = useState('')
  const [candidateManifesto, setCandidateManifesto] = useState('')
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState('')
  const [candidatePhotoFile, setCandidatePhotoFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingElection, setEditingElection] = useState<number | null>(null)
  const [editingPosition, setEditingPosition] = useState<number | null>(null)
  const [editingCandidate, setEditingCandidate] = useState<number | null>(null)
  const nav = useNavigate()
  const [candidatePreview, setCandidatePreview] = useState('')
  useEffect(() => {
    if (!candidatePhotoFile) { setCandidatePreview(''); return }
    const url = URL.createObjectURL(candidatePhotoFile)
    setCandidatePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [candidatePhotoFile])
  function choosePhoto(file?: File) {
    if (!file) { setCandidatePhotoFile(null); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Please choose a JPG, PNG, or WEBP image smaller than 5MB.'); return
    }
    setError(null); setCandidatePhotoFile(file)
  }
  async function runAction(action: () => Promise<void>) {
    try { await action() } catch (err) { setError(networkMessage(err)) }
  }

  async function fetchResults(id: number) {
    const token = localStorage.getItem('access_token')
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(baseUrl + `/api/admin/elections/${id}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResults(await responseData(res))
    } catch {
      setResults(null)
    }
  }

  async function fetchAllData() {
    const token = localStorage.getItem('access_token')
    if (!token) {
      nav('/login')
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const [elecRes, ovRes, votRes, statRes] = await Promise.all([
        fetch(baseUrl + '/api/admin/elections', { headers }),
        fetch(baseUrl + '/api/admin/overview', { headers }),
        fetch(baseUrl + '/api/admin/voters', { headers }),
        fetch(baseUrl + '/api/admin/system-status', { headers }),
      ])

      if (elecRes.status === 401 || elecRes.status === 403) {
        nav('/login')
        return
      }

      const elecData = await responseData(elecRes)
      setElections(elecData)
      if (elecData.length > 0 && selectedElection === null) {
        setSelectedElection(elecData[0].id)
      }
      if (elecData.length > 0 && !selectedElection) {
        setSelectedElection(elecData[0].id)
      }
      setOverview(await responseData(ovRes))
      setVoters(await responseData(votRes))
      setSysStatus(await responseData(statRes))
      if (selectedElection !== null) {
        await fetchResults(selectedElection)
      }
    } catch {
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 1000)
    return () => clearInterval(interval)
  }, [selectedElection])

  useEffect(() => {
    if (selectedElection !== null) {
      fetchResults(selectedElection)
    }
  }, [selectedElection])

  useEffect(() => {
    if (elections.length && selectedPositionId === null) {
      const firstElection = elections[0]
      const firstPosition = firstElection.positions?.[0]
      if (firstPosition) setSelectedPositionId(firstPosition.id)
    }
  }, [elections, selectedPositionId])

  async function createElection() {
    setError(null)
    setStatusMessage(null)
    if (!electionName.trim()) {
      setError('Election name is required.')
      return
    }

    const token = localStorage.getItem('access_token')
    const res = await fetch((import.meta.env.VITE_API_URL || '') + (editingElection ? `/api/admin/elections/${editingElection}` : '/api/admin/elections'), {
      method: editingElection ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: electionName, description: electionDescription, status: 'draft' }),
    })
    const data = await res.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
    if (!res.ok) {
      setError(errorMessage(data.detail, 'Unable to create election.'))
      return
    }

    setEditingElection(null)
    setElectionName('')
    setElectionDescription('')
    setSelectedElection(data.id)
    setStatusMessage('Election created successfully.')
    await fetchAllData()
  }

  async function createPosition() {
    setError(null)
    if (!selectedElection || !positionName.trim()) {
      setError('Please select an election and enter a position name.')
      return
    }

    const token = localStorage.getItem('access_token')
    const res = await fetch((import.meta.env.VITE_API_URL || '') + (editingPosition ? `/api/admin/positions/${editingPosition}` : `/api/admin/elections/${selectedElection}/positions`), {
      method: editingPosition ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: positionName, max_selections: 1 }),
    })
    const data = await res.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
    if (!res.ok) {
      setError(errorMessage(data.detail, 'Unable to create position.'))
      return
    }

    setSelectedPositionId(data.id)
    setEditingPosition(null)
    setPositionName('')
    setStatusMessage('Position added successfully.')
    await fetchAllData()
  }

  async function uploadCandidatePhoto(file: File | null) {
    if (!file) return ''
    const token = localStorage.getItem('access_token')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/upload-candidate-photo', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({ detail: 'Unable to upload candidate image.' }))
    if (!res.ok) throw new Error(errorMessage(data.detail, 'Unable to upload candidate image.'))
    return data.url
  }

  async function createCandidate() {
    setError(null)
    if (!selectedPositionId) {
      setError('Create a position before adding a candidate.')
      return
    }
    if (!candidateName.trim()) {
      setError('Candidate full name is required.')
      return
    }

    try {
      let url = candidatePhotoUrl
      if (candidatePhotoFile) {
        url = await uploadCandidatePhoto(candidatePhotoFile)
      }

      const token = localStorage.getItem('access_token')
      const res = await fetch((import.meta.env.VITE_API_URL || '') + (editingCandidate ? `/api/admin/candidates/${editingCandidate}` : `/api/admin/positions/${selectedPositionId}/candidates`), {
        method: editingCandidate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: candidateName,
          manifesto: candidateManifesto,
          cgpa: candidateCgpa ? Number(candidateCgpa) : null,
          photo: url || null,
        }),
      })
      const data = await res.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
      if (!res.ok) {
        throw new Error(errorMessage(data.detail, 'Unable to add candidate.'))
      }

      setEditingCandidate(null)
      setCandidateName('')
      setCandidateCgpa('')
      setCandidateManifesto('')
      setCandidatePhotoUrl('')
      setCandidatePhotoFile(null)
      setStatusMessage('Candidate added successfully.')
      await fetchAllData()
    } catch (err: any) {
      setError(networkMessage(err))
    }
  }

  async function updateElectionStatus(electionId: number, status: string) {
    const token = localStorage.getItem('access_token')
    const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/admin/elections/${electionId}/status?status=${status}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    await responseData(res)
    {
      setError(null)
      setStatusMessage(`Election marked as ${status}.`)
      await fetchAllData()
    }
  }

  function doLogout() {
    localStorage.removeItem('access_token')
    nav('/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#060b0d] text-[#f6f0ea] flex items-center justify-center">Loading admin dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-[#060b0d] text-[#f6f0ea] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] shadow-2xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-[#9db4ad]">Manage elections, positions, candidates, voters, and system status.</p>
          </div>
          <button onClick={doLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#b95d1d] text-[#f7c593] hover:bg-[#b95d1d]/10 transition-colors w-fit">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        <div className="flex overflow-x-auto bg-[#0d1715] p-2 rounded-2xl border border-[#1d2c29] gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity size={18} />} label="Overview" />
          <TabButton active={activeTab === 'elections'} onClick={() => setActiveTab('elections')} icon={<CheckSquare size={18} />} label="Elections" />
          <TabButton active={activeTab === 'voters'} onClick={() => setActiveTab('voters')} icon={<Users size={18} />} label="Voters" />
          <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<BarChart3 size={18} />} label="Results" />
          <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings size={18} />} label="System" />
        </div>

        {(error || statusMessage) && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
            {error || statusMessage}
          </div>
        )}

        <div className="min-h-[500px]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <StatCard title="Total Students" value={overview?.total_students ?? '—'} icon={<Users className="text-blue-400" size={24} />} />
              <StatCard title="Enrolled Students" value={overview?.enrolled_students ?? '—'} icon={<CheckCircle className="text-emerald-400" size={24} />} />
              <StatCard title="Elections" value={overview?.total_elections ?? '—'} icon={<CheckSquare className="text-purple-400" size={24} />} />
              <StatCard title="Active Election" value={overview ? overview.active_election || 'None' : '—'} icon={<Activity className="text-green-400" size={24} />} />
              <StatCard title="Votes Cast" value={overview?.total_ballots_cast ?? '—'} icon={<BarChart3 className="text-yellow-400" size={24} />} />
            </div>
          )}

          {activeTab === 'elections' && (
            <div className="space-y-6">
              <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                <h2 className="text-xl font-bold text-white mb-4">Create Election</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <input value={electionName} onChange={(e) => setElectionName(e.target.value)} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white" placeholder="Election name" />
                  <input value={electionDescription} onChange={(e) => setElectionDescription(e.target.value)} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white" placeholder="Election description" />
                </div>
                <button onClick={() => runAction(createElection)} className="mt-4 rounded-xl bg-[#b95d1d] px-5 py-3 font-semibold text-white hover:bg-[#d36c2a]">{editingElection ? 'Save Election' : 'Create Election'}</button>
              </div>

              <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                <h2 className="text-xl font-bold text-white mb-4">Create Position</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <select value={selectedElection ?? ''} onChange={(e) => setSelectedElection(Number(e.target.value))} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white">
                    <option value="">Select election</option>
                    {elections.map((election) => (
                      <option key={election.id} value={election.id}>{election.name}</option>
                    ))}
                  </select>
                  <input value={positionName} onChange={(e) => setPositionName(e.target.value)} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white" placeholder="Position name" />
                </div>
                <button onClick={() => runAction(createPosition)} className="mt-4 rounded-xl bg-[#b95d1d] px-5 py-3 font-semibold text-white hover:bg-[#d36c2a]">{editingPosition ? 'Save Position' : 'Add Position'}</button>
              </div>

              <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                <h2 className="text-xl font-bold text-white mb-4">Add Candidate</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <select value={selectedPositionId ?? ''} onChange={(e) => setSelectedPositionId(Number(e.target.value) || null)} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white">
                    <option value="">Select position</option>
                    {elections.flatMap((election) => election.positions || []).map((position: any) => (
                      <option key={position.id} value={position.id}>{position.name}</option>
                    ))}
                  </select>
                  <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white" placeholder="Candidate full name" />
                  <input type="number" min="0" max="5" step="0.01" value={candidateCgpa} onChange={(e) => setCandidateCgpa(e.target.value)} className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white" placeholder="Candidate CGPA" />
                  <div className="rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white">
                    <input type="file" accept="image/*" aria-label="Candidate photo" onChange={(e) => choosePhoto(e.target.files?.[0])} className="w-full text-sm text-[#d7c5b7]" />
                  </div>
                  {candidatePreview && <img src={candidatePreview} alt="Candidate photo preview" className="h-32 w-32 rounded-xl object-cover" />}
                  <textarea value={candidateManifesto} onChange={(e) => setCandidateManifesto(e.target.value)} className="md:col-span-2 rounded-xl border border-[#27413b] bg-[#101d1b] px-3 py-2 text-white" rows={4} placeholder="Candidate manifesto / description" />
                </div>
                <button onClick={() => runAction(createCandidate)} className="mt-4 rounded-xl bg-[#b95d1d] px-5 py-3 font-semibold text-white hover:bg-[#d36c2a]">{editingCandidate ? 'Save Candidate' : 'Add Candidate'}</button>
              </div>

              <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                <h2 className="text-xl font-bold text-white mb-4">Elections</h2>
                {elections.length === 0 ? (
                  <div className="text-[#9db4ad]">No elections have been created yet.</div>
                ) : (
                  <div className="space-y-4">
                    {elections.map((election) => (
                      <div key={election.id} className="rounded-2xl border border-[#27413b] bg-[#101d1b] p-4">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                          <div>
                            <div className="font-semibold text-white">{election.name}</div>
                            <div className="text-sm text-[#9db4ad]">{election.status || 'draft'}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingElection(election.id); setElectionName(election.name); setElectionDescription(election.description || '') }}>Edit Election</button>
                            <button onClick={() => runAction(() => updateElectionStatus(election.id, election.status === 'active' ? 'draft' : 'active'))} className="rounded-lg bg-[#b95d1d] px-3 py-2 text-sm font-semibold text-white">
                              {election.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                        {(election.positions || []).map(position => <div key={position.id} className="mt-4 border-t border-[#27413b] pt-3">
                          <strong>{position.name}</strong> <button onClick={() => { setSelectedElection(election.id); setEditingPosition(position.id); setPositionName(position.name) }}>Edit Position</button>
                          {(position.candidates || []).map((candidate: any) => <div key={candidate.id} className="mt-2">
                            {candidate.full_name || candidate.name} · CGPA: {candidate.cgpa ?? '—'} <button onClick={() => { setEditingCandidate(candidate.id); setSelectedPositionId(position.id); setCandidateName(candidate.full_name || candidate.name); setCandidateCgpa(candidate.cgpa == null ? '' : String(candidate.cgpa)); setCandidateManifesto(candidate.manifesto || ''); setCandidatePhotoUrl(candidate.photo || ''); setCandidatePhotoFile(null) }}>Edit Candidate</button>
                          </div>)}
                        </div>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'voters' && (
            <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] overflow-x-auto">
              <h2 className="text-xl font-bold text-white mb-6">Registered Voters</h2>
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#27413b] text-[#9db4ad] text-sm">
                    <th className="pb-3 px-4">ID</th>
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Email</th>
                    <th className="pb-3 px-4">Registration Number</th>
                    <th className="pb-3 px-4">Enrollment</th>
                    <th className="pb-3 px-4">Role</th>
                  </tr>
                </thead>
                <tbody className="text-white text-sm">
                  {voters.map((voter) => (
                    <tr key={voter.id} className="border-b border-[#27413b]/50 hover:bg-[#101d1b] transition-colors">
                      <td className="py-3 px-4">{voter.id}</td>
                      <td className="py-3 px-4">{voter.full_name}</td>
                      <td className="py-3 px-4">{voter.email || '—'}</td>
                      <td className="py-3 px-4">{voter.registration_number}</td>
                      <td className="py-3 px-4">{voter.has_enrolled ? 'Enrolled' : 'Not enrolled'}</td>
                      <td className="py-3 px-4">{voter.is_admin ? 'Admin' : 'Student'}</td>
                    </tr>
                  ))}
                  {voters.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-[#9db4ad]">No registered students yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                  <h2 className="text-lg font-bold text-white mb-4">Select Election</h2>
                  <div className="space-y-3">
                    {elections.map((election) => (
                      <button key={election.id} onClick={() => setSelectedElection(election.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedElection === election.id ? 'bg-[#b95d1d]/20 border-[#b95d1d]' : 'bg-[#101d1b] border-[#27413b] hover:bg-[#1a2c29]'}`}>
                        <div className="font-semibold text-white">{election.name}</div>
                      </button>
                    ))}
                    {elections.length === 0 && <div className="text-[#9db4ad]">No elections available.</div>}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                {selectedElection === null ? (
                  <div className="bg-[#0d1715] p-8 rounded-3xl border border-[#1d2c29] text-center text-[#9db4ad]">Select an election to view real vote totals.</div>
                ) : results ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] flex flex-col justify-center">
                        <div className="text-sm text-[#9db4ad] mb-1">Total Ballots Cast</div>
                        <div className="text-4xl font-black text-white">{results.total_ballots}</div>
                      </div>
                      <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] flex flex-col justify-center">
                        <div className="text-sm text-[#9db4ad] mb-1">Valid Ballots</div>
                        <div className="text-4xl font-black text-green-400 flex items-center gap-2">{results.valid_ballots} <CheckCircle size={24} /></div>
                      </div>
                    </div>
                    <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                      <h2 className="text-xl font-bold text-white mb-6">Results: {results.election_name}</h2>
                      {results.total_ballots === 0 ? (
                        <div className="text-[#9db4ad] py-4">No votes have been cast yet.</div>
                      ) : (
                        Object.values(results.results).map((position: any, index: number) => (
                          <div key={index} className="mb-8 last:mb-0">
                            <h3 className="text-lg font-bold text-[#d7c5b7] mb-4 border-b border-[#27413b] pb-2">{position.position_name}</h3>
                            <div className="space-y-4">
                              {Object.values(position.candidates).sort((a: any, b: any) => b.votes - a.votes).map((candidate: any, cidx: number) => {
                                const total = results.valid_ballots || 1
                                const pct = Math.round((candidate.votes / total) * 100)
                                return (
                                  <div key={cidx} className="bg-[#101d1b] p-4 rounded-xl border border-[#27413b]">
                                    <div className="flex justify-between items-end mb-2">
                                      <div className="font-semibold text-white text-lg">{candidate.name}</div>
                                      <div className="text-[#b95d1d] font-bold text-xl">{candidate.votes} votes <span className="text-sm text-[#9db4ad] font-normal">({pct}%)</span></div>
                                    </div>
                                    <div className="h-2 w-full bg-[#1a2c29] rounded-full overflow-hidden"><div className="h-full bg-[#b95d1d] transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-[#0d1715] p-8 rounded-3xl border border-[#1d2c29] text-center text-[#9db4ad]">Loading results...</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] max-w-xl">
              <h2 className="text-xl font-bold text-white mb-6">System</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-[#101d1b] border border-[#27413b] rounded-xl">
                  <span className="text-[#9db4ad]">Backend/API status</span>
                  <span className={`font-semibold flex items-center gap-2 ${sysStatus?.status === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                    {sysStatus?.status === 'OK' ? <CheckCircle size={16}/> : <ShieldAlert size={16}/>}
                    {sysStatus?.status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#101d1b] border border-[#27413b] rounded-xl">
                  <span className="text-[#9db4ad]">Database status</span>
                  <span className={`font-semibold flex items-center gap-2 ${sysStatus?.database === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                    {sysStatus?.database === 'OK' ? <CheckCircle size={16}/> : <ShieldAlert size={16}/>}
                    {sysStatus?.database || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#101d1b] border border-[#27413b] rounded-xl">
                  <span className="text-[#9db4ad]">Version</span>
                  <span className="font-semibold text-white">{sysStatus?.version || 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${active ? 'bg-[#b95d1d] text-white' : 'text-[#9db4ad] hover:bg-[#1a2c29] hover:text-white'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function StatCard({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] flex items-center justify-between">
      <div>
        <div className="text-sm text-[#9db4ad] mb-1">{title}</div>
        <div className="text-3xl font-black text-white">{value}</div>
      </div>
      <div className="bg-[#101d1b] p-3 rounded-2xl border border-[#27413b]">{icon}</div>
    </div>
  )
}
