import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export default function VerifyFirst(){
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const nav = useNavigate()

  useEffect(() => () => { const stream = videoRef.current?.srcObject as MediaStream; stream?.getTracks().forEach(t => t.stop()) }, [])

  async function startCamera(){
    setError(null)
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if(videoRef.current){
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStreaming(true)
      }
    }catch(e:any){
      setError('Camera permission denied or not available')
    }
  }

  function stopCamera(){
    const stream = videoRef.current?.srcObject as MediaStream
    stream?.getTracks().forEach(t=>t.stop())
    setStreaming(false)
  }

  async function captureAndVerify(){
    setError(null)
    if(!videoRef.current || !canvasRef.current) return
    setVerifying(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if(!ctx) { setVerifying(false); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(async (blob)=>{
      if(!blob) { setVerifying(false); return; }
      const form = new FormData()
      form.append('file', blob, 'capture.png')
      try{
        const token = localStorage.getItem('access_token')
        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/biometric/verify', { method: 'POST', body: form, headers: { 'Authorization': 'Bearer ' + token } })
        const data = await res.json()
        if(!res.ok) throw new Error(errorMessage(data.detail, 'Verify failed'))
        if(data.matched){
          stopCamera()
          nav('/vote')
        }else{
          setError('Face verification failed: '+(data.reason||''))
        }
      }catch(err:any){
        setError(err.message)
      } finally {
        setVerifying(false)
      }
    }, 'image/png')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#1d2c29] bg-[#0d1715] shadow-2xl shadow-black/30">
        <div className="border-b border-[#1d2c29] px-6 py-4 flex items-center justify-between">
          <BackButton />
          <div className="text-sm font-semibold uppercase tracking-wider text-[#c88752]">Step 1: Verification</div>
        </div>
        
        <div className="p-8">
          <h1 className="text-2xl font-semibold mb-2 text-white">Identity Verification</h1>
          <p className="text-sm text-[#d7c5b7] mb-6">Position your face inside the frame. Click Verify when ready to begin casting your vote.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4 overflow-hidden rounded-xl border border-[#27413b] bg-black/90">
                <video ref={videoRef} className="h-[240px] w-full object-cover bg-[#0a1110]" />
              </div>
              <div className="flex flex-wrap gap-2">
                {!streaming ? (
                  <button onClick={startCamera} className="rounded-lg bg-[#b95d1d] px-4 py-2 text-sm font-medium text-white hover:bg-[#d36c2a]">
                    Open Camera
                  </button>
                ) : (
                  <button onClick={stopCamera} className="rounded-lg border border-[#27413b] bg-[#101d1b] px-4 py-2 text-sm font-medium text-white hover:border-[#b95d1d]">
                    Stop Camera
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex-1 rounded-xl border border-[#213c36] bg-[#101d1b] p-4 flex flex-col justify-center items-center text-center">
                <div className="h-16 w-16 mb-4 rounded-full bg-[#123c32] flex items-center justify-center text-[#8fe3b5]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Verify</h3>
                <p className="text-sm text-[#d7c5b7] mb-6">Ensure good lighting and remove glasses or hats.</p>
                <button onClick={captureAndVerify} disabled={!streaming || verifying} className="w-full rounded-lg bg-[#123c32] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#0d2a24]">
                  {verifying ? 'Verifying...' : 'Verify Identity'}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  )
}
