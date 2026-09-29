import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Users, Activity, CheckCircle, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const [elections, setElections] = useState<any[]>([])
  const [results, setResults] = useState<any>(null)
  const [selectedElection, setSelectedElection] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    fetchElections()
  }, [])

  useEffect(() => {
    if (selectedElection !== null) {
      fetchResults(selectedElection)
    }
  }, [selectedElection])

  async function fetchElections() {
    const token = localStorage.getItem('access_token')
    if (!token) return nav('/login')
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/elections', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) nav('/login')
        throw new Error('Failed to fetch elections')
      }
      const data = await res.json()
      setElections(data)
      if (data.length > 0 && selectedElection === null) {
        setSelectedElection(data[0].id)
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchResults(id: number) {
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`/api/admin/elections/${id}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setResults(await res.json())
      }
    } catch (e) {
      console.error(e)
    }
  }

  function doLogout() {
    localStorage.removeItem('access_token')
    nav('/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#060b0d] text-[#f6f0ea] flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#060b0d] text-[#f6f0ea] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] shadow-2xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-[#9db4ad]">Manage elections and view real-time results.</p>
          </div>
          <button onClick={doLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#b95d1d] text-[#f7c593] hover:bg-[#b95d1d]/10 transition-colors">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar: Elections List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="text-[#b95d1d]" /> Elections
              </h2>
              <div className="space-y-3">
                {elections.map((elec) => (
                  <button
                    key={elec.id}
                    onClick={() => setSelectedElection(elec.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedElection === elec.id ? 'bg-[#b95d1d]/20 border-[#b95d1d]' : 'bg-[#101d1b] border-[#27413b] hover:bg-[#1a2c29]'}`}
                  >
                    <div className="font-semibold text-white">{elec.name}</div>
                    <div className="text-sm text-[#9db4ad] flex items-center gap-2 mt-1">
                      {elec.status === 'active' ? <Activity size={14} className="text-green-500"/> : <Clock size={14} />}
                      Status: {elec.status}
                    </div>
                  </button>
                ))}
                {elections.length === 0 && (
                  <div className="text-[#9db4ad] text-center py-4">No elections found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content: Results */}
          <div className="lg:col-span-2 space-y-6">
            {results ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] flex flex-col justify-center">
                    <div className="text-sm text-[#9db4ad] mb-1">Total Ballots Cast</div>
                    <div className="text-4xl font-black text-white">{results.total_ballots}</div>
                  </div>
                  <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] flex flex-col justify-center">
                    <div className="text-sm text-[#9db4ad] mb-1">Valid Ballots</div>
                    <div className="text-4xl font-black text-green-400 flex items-center gap-2">
                      {results.valid_ballots} <CheckCircle size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
                  <h2 className="text-xl font-bold text-white mb-6">Live Results: {results.election_name}</h2>
                  
                  {Object.values(results.results).map((pos: any, idx: number) => (
                    <div key={idx} className="mb-8 last:mb-0">
                      <h3 className="text-lg font-bold text-[#d7c5b7] mb-4 border-b border-[#27413b] pb-2">
                        {pos.position_name}
                      </h3>
                      <div className="space-y-4">
                        {Object.values(pos.candidates).sort((a: any, b: any) => b.votes - a.votes).map((cand: any, cidx: number) => {
                          const total = results.valid_ballots || 1;
                          const pct = Math.round((cand.votes / total) * 100);
                          return (
                            <div key={cidx} className="bg-[#101d1b] p-4 rounded-xl border border-[#27413b]">
                              <div className="flex justify-between items-end mb-2">
                                <div className="font-semibold text-white text-lg">{cand.name}</div>
                                <div className="text-[#b95d1d] font-bold text-xl">{cand.votes} votes <span className="text-sm text-[#9db4ad] font-normal">({pct}%)</span></div>
                              </div>
                              <div className="h-2 w-full bg-[#1a2c29] rounded-full overflow-hidden">
                                <div className="h-full bg-[#b95d1d] transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-[#0d1715] p-8 rounded-3xl border border-[#1d2c29] text-center text-[#9db4ad]">
                {selectedElection ? "Loading results..." : "Select an election to view results."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
