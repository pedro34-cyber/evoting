import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export default function Review(){
  const nav = useNavigate()
  const selections = JSON.parse(localStorage.getItem('vote_selections')||'{}')

  async function cast(){
    // open camera for second verification
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video,0,0,canvas.width,canvas.height)
    stream.getTracks().forEach(t=>t.stop())
    canvas.toBlob(async (blob)=>{
      if(!blob) return
      const form = new FormData()
    form.append('file', blob, 'capture.png')
    try{
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/elections/1/ballot/authorize', { method: 'POST', body: form, headers: { 'Authorization': 'Bearer ' + token } })
        const data = await res.json()
        if(!res.ok) throw new Error(data.detail || 'Authorize failed')
        const voting_token = data.voting_token
        // create encrypted ballot (simple base64 of JSON for demo)
        const ballot = btoa(JSON.stringify(selections))
        const res2 = await fetch('/api/elections/1/ballot/cast', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ voting_token, encrypted_ballot: ballot }) })
        const data2 = await res2.json()
        if(!res2.ok) throw new Error(data2.detail || 'Cast failed')
        alert('Vote cast successfully')
        nav('/')
      }catch(err:any){
        alert('Error: '+err.message)
      }
    }, 'image/png')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl bg-white shadow p-6 rounded">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold mb-4">Review Your Vote</h1>
        <div className="mb-4">
          {Object.entries(selections).map(([pos,cid])=> (
            <div key={pos}>Position {pos}: Candidate {cid}</div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <BackButton />
          <button onClick={cast} className="px-4 py-2 bg-green-600 text-white rounded">Cast Vote</button>
        </div>
      </div>
    </div>
  )
}
