import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Users, Activity, CheckCircle, Clock, BarChart3, Settings, ShieldAlert, CheckSquare } from 'lucide-react'

type Tab = 'overview' | 'elections' | 'voters' | 'results' | 'status'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [elections, setElections] = useState<any[]>([])
  const [voters, setVoters] = useState<any[]>([])
  const [overview, setOverview] = useState<any>(null)
  const [sysStatus, setSysStatus] = useState<any>(null)
  const [results, setResults] = useState<any>(null)
  const [selectedElection, setSelectedElection] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (selectedElection !== null) {
      fetchResults(selectedElection)
    }
  }, [selectedElection])

  async function fetchAllData() {
    setLoading(true)
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
        fetch(baseUrl + '/api/admin/system-status', { headers })
      ])
      
      if (!elecRes.ok || elecRes.status === 401) {
        nav('/login')
        throw new Error('Unauthorized')
      }

      const elecData = await elecRes.json()
      setElections(elecData)
      if (elecData.length > 0 && selectedElection === null) {
        setSelectedElection(elecData[0].id)
      }
      
      if (ovRes.ok) setOverview(await ovRes.json())
      if (votRes.ok) setVoters(await votRes.json())
      if (statRes.ok) setSysStatus(await statRes.json())
      
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchResults(id: number) {
    const token = localStorage.getItem('access_token')
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(baseUrl + `/api/admin/elections/${id}/results`, {
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
    <div className="min-h-screen bg-[#060b0d] text-[#f6f0ea] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] shadow-2xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-[#9db4ad]">Manage elections, view voters, and check real-time results.</p>
          </div>
          <button onClick={doLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#b95d1d] text-[#f7c593] hover:bg-[#b95d1d]/10 transition-colors w-fit">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto bg-[#0d1715] p-2 rounded-2xl border border-[#1d2c29] gap-2 hide-scrollbar">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity size={18} />} label="Overview" />
          <TabButton active={activeTab === 'elections'} onClick={() => setActiveTab('elections')} icon={<CheckSquare size={18} />} label="Elections" />
          <TabButton active={activeTab === 'voters'} onClick={() => setActiveTab('voters')} icon={<Users size={18} />} label="Voters" />
          <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<BarChart3 size={18} />} label="Results" />
          <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} icon={<Settings size={18} />} label="System Status" />
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Students" value={overview?.total_students || 0} icon={<Users className="text-blue-400" size={24} />} />
              <StatCard title="Total Elections" value={overview?.total_elections || 0} icon={<CheckSquare className="text-purple-400" size={24} />} />
              <StatCard title="Active Elections" value={overview?.active_elections || 0} icon={<Activity className="text-green-400" size={24} />} />
              <StatCard title="Total Ballots Cast" value={overview?.total_ballots_cast || 0} icon={<CheckCircle className="text-yellow-400" size={24} />} />
            </div>
          )}

          {activeTab === 'elections' && (
            <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29]">
              <h2 className="text-xl font-bold text-white mb-6">Manage Elections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {elections.map((elec) => (
                  <div key={elec.id} className="bg-[#101d1b] border border-[#27413b] p-5 rounded-2xl">
                    <h3 className="font-semibold text-lg text-white mb-2">{elec.name}</h3>
                    <div className="text-sm text-[#9db4ad] flex items-center gap-2 mb-4">
                      {elec.status === 'active' ? <Activity size={14} className="text-green-500"/> : <Clock size={14} />}
                      Status: <span className="capitalize">{elec.status}</span>
                    </div>
                  </div>
                ))}
                {elections.length === 0 && (
                  <div className="text-[#9db4ad] py-4 col-span-full">No active election</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'voters' && (
            <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] overflow-x-auto">
              <h2 className="text-xl font-bold text-white mb-6">Registered Voters</h2>
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#27413b] text-[#9db4ad] text-sm">
                    <th className="pb-3 px-4">ID</th>
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Reg Number</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Role</th>
                  </tr>
                </thead>
                <tbody className="text-white text-sm">
                  {voters.map((voter) => (
                    <tr key={voter.id} className="border-b border-[#27413b]/50 hover:bg-[#101d1b] transition-colors">
                      <td className="py-3 px-4">{voter.id}</td>
                      <td className="py-3 px-4">{voter.full_name}</td>
                      <td className="py-3 px-4">{voter.registration_number}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${voter.account_status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {voter.account_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{voter.is_admin ? 'Admin' : 'Voter'}</td>
                    </tr>
                  ))}
                  {voters.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-[#9db4ad]">No registered students yet</td></tr>
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
                    {elections.map((elec) => (
                      <button
                        key={elec.id}
                        onClick={() => setSelectedElection(elec.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${selectedElection === elec.id ? 'bg-[#b95d1d]/20 border-[#b95d1d]' : 'bg-[#101d1b] border-[#27413b] hover:bg-[#1a2c29]'}`}
                      >
                        <div className="font-semibold text-white">{elec.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                      {results.total_ballots === 0 ? (
                        <div className="text-[#9db4ad] py-4">No votes have been cast yet</div>
                      ) : (
                        Object.values(results.results).map((pos: any, idx: number) => (
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
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-[#0d1715] p-8 rounded-3xl border border-[#1d2c29] text-center text-[#9db4ad]">
                    {selectedElection ? "Loading results..." : "Select an election to view results."}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] max-w-xl">
              <h2 className="text-xl font-bold text-white mb-6">System Status</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-[#101d1b] border border-[#27413b] rounded-xl">
                  <span className="text-[#9db4ad]">System Health</span>
                  <span className={`font-semibold flex items-center gap-2 ${sysStatus?.status === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                    {sysStatus?.status === 'OK' ? <CheckCircle size={16}/> : <ShieldAlert size={16}/>}
                    {sysStatus?.status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#101d1b] border border-[#27413b] rounded-xl">
                  <span className="text-[#9db4ad]">Database Connection</span>
                  <span className={`font-semibold flex items-center gap-2 ${sysStatus?.database === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                    {sysStatus?.database === 'OK' ? <CheckCircle size={16}/> : <ShieldAlert size={16}/>}
                    {sysStatus?.database || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#101d1b] border border-[#27413b] rounded-xl">
                  <span className="text-[#9db4ad]">API Version</span>
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
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap
        ${active ? 'bg-[#b95d1d] text-white' : 'text-[#9db4ad] hover:bg-[#1a2c29] hover:text-white'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-[#0d1715] p-6 rounded-3xl border border-[#1d2c29] flex items-center justify-between">
      <div>
        <div className="text-sm text-[#9db4ad] mb-1">{title}</div>
        <div className="text-3xl font-black text-white">{value}</div>
      </div>
      <div className="bg-[#101d1b] p-3 rounded-2xl border border-[#27413b]">
        {icon}
      </div>
    </div>
  )
}
