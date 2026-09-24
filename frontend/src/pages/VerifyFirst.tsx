import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export default function VerifyFirst(){
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

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
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if(!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(async (blob)=>{
      if(!blob) return
      const form = new FormData()
    form.append('file', blob, 'capture.png')
    try{
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/biometric/verify', { method: 'POST', body: form, headers: { 'Authorization': 'Bearer ' + token } })
        const data = await res.json()
        if(!res.ok) throw new Error(data.detail || 'Verify failed')
        if(data.matched){
          nav('/vote')
        }else{
          setError('Face verification failed: '+(data.reason||''))
        }
      }catch(err:any){
        setError(err.message)
      }
    }, 'image/png')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl bg-white shadow p-6 rounded">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-semibold mb-4">Face Verification</h1>
        <p className="text-sm text-gray-600 mb-4">Position your face inside the frame. Click Verify when ready.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <video ref={videoRef} className="w-full bg-black" />
            <div className="mt-2">
              {!streaming ? (
                <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded">Open Camera</button>
              ) : (
                <button onClick={stopCamera} className="px-4 py-2 bg-red-600 text-white rounded">Stop Camera</button>
              )}
              <button onClick={captureAndVerify} className="ml-2 px-4 py-2 bg-green-600 text-white rounded">Verify</button>
            </div>
          </div>
          <div>
            <canvas ref={canvasRef} className="w-full bg-gray-100" />
            {error && <div className="mt-2 text-red-600">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
