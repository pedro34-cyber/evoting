import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export default function Review(){
  const nav = useNavigate()
  const selections = JSON.parse(localStorage.getItem('vote_selections')||'{}')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const posNames: Record<number, string> = {
    1: "President",
    2: "Vice President",
    3: "Secretary General"
  }

  async function cast(){
    setError(null)
    setSubmitting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if(!ctx) { setSubmitting(false); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      stream.getTracks().forEach(t=>t.stop())
      
      canvas.toBlob(async (blob)=>{
        if(!blob) { setSubmitting(false); return; }
        const form = new FormData()
        form.append('file', blob, 'capture.png')
        
        try{
          const token = localStorage.getItem('access_token')
          const res = await fetch('/api/elections/1/ballot/authorize', { method: 'POST', body: form, headers: { 'Authorization': 'Bearer ' + token } })
          const data = await res.json()
          if(!res.ok) throw new Error(data.detail || 'Authorization failed. Please ensure your face is clearly visible.')
          
          const voting_token = data.voting_token
          const ballot = btoa(JSON.stringify(selections))
          
          const res2 = await fetch('/api/elections/1/ballot/cast', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ voting_token, encrypted_ballot: ballot }) })
          const data2 = await res2.json()
          if(!res2.ok) throw new Error(data2.detail || 'Failed to cast ballot.')
          
          alert('Vote cast successfully! Your ballot has been securely recorded.')
          nav('/dashboard')
        } catch(err:any) {
          setError(err.message)
        } finally {
          setSubmitting(false)
        }
      }, 'image/png')
    } catch(err:any) {
      setError('Camera access is required to authorize your ballot.')
      setSubmitting(false)
    }
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
              {Object.entries(selections).map(([pos,cid])=> (
                <div key={pos} className="flex justify-between items-center border-b border-[#213c36] pb-3 last:border-0 last:pb-0">
                  <span className="text-[#d7c5b7] font-medium">{posNames[Number(pos)] || `Position ${pos}`}</span>
                  <span className="text-white font-bold bg-[#123c32] px-3 py-1 rounded-full text-sm">Candidate {cid as string}</span>
                </div>
              ))}
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
             <button onClick={cast} disabled={submitting} className="w-full max-w-sm rounded-xl bg-[#123c32] px-6 py-4 font-bold text-white shadow-lg hover:bg-[#0d2a24] disabled:opacity-50">
               {submitting ? 'Authorizing & Casting...' : 'Cast Secure Vote'}
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
