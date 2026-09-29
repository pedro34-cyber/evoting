import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type Candidate = { id:number, name:string, position_id:number }

export default function Vote(){
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(()=>{
    fetch((import.meta.env.VITE_API_URL || '') + '/api/elections/1/candidates')
      .then(r=>r.json())
      .then(data => {
        setCandidates(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  },[])

  const positions = Array.from(new Set(candidates.map(c=>c.position_id))).sort((a,b)=>a-b)

  function select(position_id:number, candidate_id:number){
    setSelections(prev=>({...prev, [position_id]: candidate_id}))
  }

  function goReview(){
    for(const pid of positions){
      if(!selections[pid]){
        alert('Please select a candidate for all positions before continuing.')
        return
      }
    }
    localStorage.setItem('vote_selections', JSON.stringify(selections))
    nav('/review')
  }

  const posNames: Record<number, string> = {
    1: "President",
    2: "Vice President",
    3: "Secretary General"
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
            <h1 className="text-2xl font-bold text-white mb-2">Cast Your Vote</h1>
            <p className="text-sm text-[#d7c5b7]">Select one candidate for each position below.</p>
          </div>
          
          {loading ? (
            <div className="text-center py-10 text-[#d7c5b7]">Loading ballot...</div>
          ) : (
            <div className="space-y-12">
              {positions.map(pid => (
                <div key={pid} className="rounded-2xl border border-[#213c36] bg-[#101d1b] p-6 shadow-lg">
                  <div className="mb-6 border-b border-[#213c36] pb-3">
                    <h2 className="text-xl font-bold text-white tracking-wide uppercase">
                      {posNames[pid] || `Position ${pid}`}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidates.filter(c => c.position_id === pid).map(c => {
                      const isSelected = selections[pid] === c.id;
                      return (
                        <div 
                          key={c.id} 
                          onClick={() => select(pid, c.id)}
                          className={`cursor-pointer rounded-xl border p-6 flex flex-col items-center text-center transition-all duration-300 ${isSelected ? 'border-[#b95d1d] bg-[#b95d1d]/10 shadow-[0_0_15px_rgba(185,93,29,0.3)] scale-105' : 'border-[#27413b] bg-[#13221f] hover:border-[#b95d1d]/50 hover:bg-[#162b27]'}`}
                        >
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4 transition-colors ${isSelected ? 'bg-[#b95d1d] text-white shadow-lg' : 'bg-[#1d2c29] text-[#9db4ad]'}`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-white text-lg leading-tight">{c.name}</h3>
                          
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

          <div className="mt-8 flex items-center justify-end border-t border-[#1d2c29] pt-6">
            <button onClick={goReview} className="rounded-xl bg-[#b95d1d] px-8 py-3 font-semibold text-white hover:bg-[#d36c2a]">
              Review & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
