import React, { useRef, useState } from 'react'
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

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStreaming(true)
      }
    } catch {
      setError('Camera permission denied or not available.')
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    setStreaming(false)
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

    if (!videoRef.current || !canvasRef.current) {
      setError('Open your camera first before enrolling your face.')
      return
    }

    setIsSubmitting(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas is unavailable.')
      }
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((file) => {
          if (!file) reject(new Error('Unable to capture image.'))
          else resolve(file)
        }, 'image/png')
      })
      const profileImage = await blobToDataUrl(blob)

      const regRes = await fetch('/api/auth/register', {
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
        throw new Error(regData.detail || 'Registration failed.')
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: form.registration_number,
          password: form.password,
        }),
      })

      const loginData = await loginRes.json().catch(() => ({ detail: 'Login request failed.' }))
      if (!loginRes.ok) {
        throw new Error(loginData.detail || 'Login failed.')
      }

      const token = loginData.access_token
      const formData = new FormData()
      formData.append('file', blob, 'enrollment.png')

      const enrollRes = await fetch('/api/biometric/enroll', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const enrollData = await enrollRes.json().catch(() => ({ detail: 'Biometric enrollment failed.' }))
      if (!enrollRes.ok) {
        throw new Error(enrollData.detail || 'Biometric enrollment failed.')
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
                  placeholder="Victor Odhiambo"
                />
              </label>

              <label className="block text-sm font-medium text-[#f7e9dd]">
                Student Registration Number
                <input
                  value={form.registration_number}
                  onChange={(e) => updateField('registration_number', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#0d1715] px-3 py-2 text-white"
                  placeholder="SUG2027001"
                />
              </label>

              <label className="block text-sm font-medium text-[#f7e9dd]">
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#27413b] bg-[#0d1715] px-3 py-2 text-white"
                  placeholder="At least 8 characters"
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

            <div className="mb-4 overflow-hidden rounded-xl border border-[#27413b] bg-black/90">
              <video ref={videoRef} className="h-[320px] w-full object-cover bg-[#0a1110]" />
            </div>

            <div className="mb-4 flex flex-wrap gap-3">
              {!streaming ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-lg bg-[#b95d1d] px-4 py-2 text-sm font-medium text-white hover:bg-[#d36c2a]"
                >
                  Open Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg border border-[#27413b] bg-[#101d1b] px-4 py-2 text-sm font-medium text-white hover:border-[#b95d1d]"
                >
                  Stop Camera
                </button>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
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
