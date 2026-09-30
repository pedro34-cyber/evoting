import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

type FormState = {
  full_name: string
  registration_number: string
  password: string
  confirm_password: string
}

const initialForm: FormState = {
  full_name: '',
  registration_number: '',
  password: '',
  confirm_password: '',
}

export default function Registration() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [streaming, setStreaming] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturePhase, setCapturePhase] = useState<'idle' | 'streaming' | 'countdown' | 'captured'>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Unable to read image data.'))
      reader.readAsDataURL(blob)
    })
  }

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    setStreaming(false)
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    setCapturedImage(dataUrl)
    setCapturePhase('captured')
    stopCamera()
  }

  function runCountdown() {
    setCapturePhase('countdown')
    setCountdown(3)
    let current = 3
    
    const interval = setInterval(() => {
      current -= 1
      if (current > 0) {
        setCountdown(current)
      } else {
        clearInterval(interval)
        setCountdown(null)
        captureFrame()
      }
    }, 1000)
  }

  function startCamera() {
    setError(null)
    setCapturedImage(null)
    setCapturePhase('idle')
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().then(() => {
          setStreaming(true)
          setCapturePhase('streaming')
        })
      }
    }).catch(() => {
      setError('Camera permission denied or not available.')
    })
  }

  function retakeImage() {
    startCamera()
  }

  async function handleSubmit() {
    setError(null)

    if (!form.full_name.trim() || !form.registration_number.trim()) {
      setError('Full name and registration number are required.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    if (!capturedImage) {
      setError('Please capture your face before enrolling.')
      return
    }

    setIsSubmitting(true)

    try {
      const blob = await (await fetch(capturedImage)).blob()
      const profileImage = capturedImage

      const regRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          registration_number: form.registration_number,
          password: form.password,
          confirm_password: form.confirm_password,
          profile_image: profileImage,
        }),
      })

      const regData = await regRes.json().catch(() => ({ detail: 'Registration request failed.' }))
      if (!regRes.ok) {
        let errMsg = regData.detail || 'Registration failed.'
        if (Array.isArray(regData.detail)) {
          errMsg = regData.detail.map((d: any) => d.msg).join(', ')
        }
        throw new Error(typeof errMsg === 'string' ? errMsg : 'Registration failed.')
      }

      const loginRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: form.registration_number,
          password: form.password,
        }),
      })

      const loginData = await loginRes.json().catch(() => ({ detail: 'Login request failed.' }))
      if (!loginRes.ok) {
        let errMsg = loginData.detail || 'Login failed.'
        if (Array.isArray(loginData.detail)) {
          errMsg = loginData.detail.map((d: any) => d.msg).join(', ')
        }
        throw new Error(typeof errMsg === 'string' ? errMsg : 'Login failed.')
      }

      const token = loginData.access_token
      const formData = new FormData()
      formData.append('file', blob, 'enrollment.png')

      const enrollRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/biometric/enroll', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const enrollData = await enrollRes.json().catch(() => ({ detail: 'Biometric enrollment failed.' }))
      if (!enrollRes.ok) {
        let errMsg = enrollData.detail || 'Biometric enrollment failed.'
        if (Array.isArray(enrollData.detail)) {
          errMsg = enrollData.detail.map((d: any) => d.msg).join(', ')
        }
        if (typeof errMsg === 'string') {
          const lowerMsg = errMsg.toLowerCase()
          if (lowerMsg.includes('no face')) {
            throw new Error("We couldn't detect your face. Please try again.")
          }
          if (lowerMsg.includes('multiple face')) {
            throw new Error("Please make sure only one face is visible.")
          }
          throw new Error(errMsg)
        }
        throw new Error('Biometric enrollment failed.')
      }

      localStorage.setItem('access_token', token)
      localStorage.setItem('profile_image', profileImage)
      setForm(initialForm)
      alert('Registration and biometric enrollment successful. Please log in.')
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#1d2c29] bg-[#0d1715] shadow-2xl shadow-black/30">
        <div className="border-b border-[#1d2c29] px-6 py-4">
          <BackButton />
        </div>

        <div className="grid md:grid-cols-2">
          <div className="border-r border-[#1d2c29] bg-[#101d1b] p-8">
            <h1 className="mb-2 text-3xl font-bold text-white">Create your student account</h1>
            <p className="mb-6 text-sm text-[#d7c5b7]">
              Complete your profile below and enroll your face to enable secure voting.
            </p>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#f7e9dd]">
                Full Name
                <input
                  value={form.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#0d1715] px-3 py-2 text-white"
                  placeholder="Enter your full name"
                />
              </label>

              <label className="block text-sm font-medium text-[#f7e9dd]">
                Student Registration Number
                <input
                  value={form.registration_number}
                  onChange={(e) => updateField('registration_number', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#0d1715] px-3 py-2 text-white"
                  placeholder="Enter your student registration number"
                />
              </label>

              <label className="block text-sm font-medium text-[#f7e9dd]">
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#0d1715] px-3 py-2 text-white"
                  placeholder="Create a password"
                />
              </label>

              <label className="block text-sm font-medium text-[#f7e9dd]">
                Confirm Password
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#0d1715] px-3 py-2 text-white"
                  placeholder="Re-enter your password"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">Face enrollment</h2>
              <p className="text-sm text-[#d7c5b7]">Position your face inside the frame. Make sure your face is clearly visible.</p>
            </div>

            <div className="mb-4 relative overflow-hidden rounded-xl border border-[#27413b] bg-black/90">
              {capturedImage ? (
                <>
                  <img src={capturedImage} alt="Captured face" className="h-[320px] w-full object-cover bg-[#0a1110]" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded bg-green-500/90 px-4 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
                    Face captured successfully.
                  </div>
                </>
              ) : (
                <>
                  <video ref={videoRef} className="h-[320px] w-full object-cover bg-[#0a1110]" />
                  {capturePhase === 'countdown' && countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-6xl font-bold text-white drop-shadow-lg animate-pulse">{countdown}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-3">
              {capturedImage ? (
                <button
                  type="button"
                  onClick={retakeImage}
                  className="rounded-lg border border-[#27413b] bg-[#101d1b] px-4 py-2 text-sm font-medium text-white hover:border-[#b95d1d]"
                >
                  Retake Picture
                </button>
              ) : capturePhase === 'idle' ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-lg bg-[#b95d1d] px-4 py-2 text-sm font-medium text-white hover:bg-[#d36c2a]"
                >
                  Open Camera
                </button>
              ) : capturePhase === 'streaming' ? (
                <button
                  type="button"
                  onClick={runCountdown}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Capture
                </button>
              ) : null}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !capturedImage}
              className="w-full rounded-lg bg-[#123c32] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#0d2a24]"
            >
              {isSubmitting ? 'Registering...' : 'Register & Enroll'}
            </button>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-[#f7e9dd] underline hover:text-[#f7c593]"
              >
                Already have an account? Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
