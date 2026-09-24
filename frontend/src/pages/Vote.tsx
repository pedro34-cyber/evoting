import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type Candidate = { id:number, name:string, position_id:number }

export default function Vote(){
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selections, setSelections] = useState<Record<number, number>>({})
  const nav = useNavigate()

  useEffect(()=>{
    // fetch candidates for election 1
    fetch('/api/elections/1/candidates').then(r=>r.json()).then(setCandidates)
  },[])

  const positions = Array.from(new Set(candidates.map(c=>c.position_id)))

  function select(position_id:number, candidate_id:number){
    setSelections(prev=>({...prev, [position_id]: candidate_id}))
  }

  function goReview(){
    // simple validation: every position must have a selection
    for(const pid of positions){
      if(!selections[pid]){
        alert('Please select candidate for all positions')
        return
      }
    }
    // pass selections via localStorage for brevity
    localStorage.setItem('vote_selections', JSON.stringify(selections))
    nav('/review')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-3xl bg-white shadow p-6 rounded">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold mb-4">Cast Your Vote</h1>
        {positions.map(pid=> (
          <div key={pid} className="mb-4">
            <h2 className="font-semibold">Position {pid}</h2>
            <div>
              {candidates.filter(c=>c.position_id===pid).map(c=> (
                <div key={c.id} className="mt-2">
                  <label>
                    <input type="radio" name={`pos-${pid}`} checked={selections[pid]===c.id} onChange={()=>select(pid,c.id)} /> {c.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <BackButton />
          <button onClick={goReview} className="px-4 py-2 bg-blue-600 text-white rounded">Review</button>
        </div>
      </div>
    </div>
  )
}
