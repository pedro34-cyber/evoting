import { errorMessage, networkMessage, responseData, imageUrl } from '../lib/api'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function EnrollFace() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  const photoStatus = useMemo(() => {
    if (isSubmitting) return 'Processing face...'
    if (selectedFile) return 'Photo selected'
    return 'No photo selected'
  }, [isSubmitting, selectedFile])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function onImageSelected(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Please choose a JPG, PNG, or WEBP image smaller than 5MB.')
      return
    }

    setSelectedFile(file)
    setError(null)
    setStatus('Photo selected')
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setError('Please upload or capture a face photo.')
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setStatus('Processing face...')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const enrollRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/biometric/enroll', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      })

      const enrollData = await enrollRes.json().catch(() => ({ detail: 'Unable to connect to the server.' }))
      if (!enrollRes.ok) {
        const msg = typeof enrollData.detail === 'string' ? enrollData.detail : 'Biometric enrollment failed.'
        const lower = msg.toLowerCase()
        if (lower.includes('no face')) throw new Error('No face detected. Please try again.')
        if (lower.includes('multiple faces')) throw new Error('Multiple faces detected. Please make sure only one face is visible.')
        if (lower.includes('invalid image')) throw new Error('Invalid image. Please upload a clear photo of yourself.')
        if (lower.includes('blurry') || lower.includes('unusable')) throw new Error('The image is blurry or unusable. Please try a clearer photo.')
        throw new Error(msg)
      }

      setStatus('Face enrolled successfully.')
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err) {
      setStatus('')
      setError(networkMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060b0d] px-4 py-8 text-[#f6f0ea]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#1d2c29] bg-[#0d1715] p-8 shadow-2xl shadow-black/30 text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Secure Face Enrollment</h1>
        <p className="mb-6 text-sm text-[#d7c5b7]">
          Upload a photo or take a photo of yourself to enable secure voting.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3"> 
          <label className="cursor-pointer rounded-lg bg-[#b95d1d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d36c2a] transition-colors">
            Upload Photo
            <input disabled={isSubmitting} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onImageSelected(e.target.files?.[0])} />
          </label>
          <label className="cursor-pointer rounded-lg border border-[#b95d1d] bg-transparent px-4 py-3 text-sm font-semibold text-[#f7c593] hover:bg-[#b95d1d]/10 transition-colors">
            Take Photo
            <input disabled={isSubmitting} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={(e) => onImageSelected(e.target.files?.[0])} />
          </label>
        </div>

        {preview ? (
          <div className="mb-6">
            <img src={preview} alt="Face preview" className="mx-auto h-[240px] w-[240px] object-cover rounded-full border-4 border-[#123c32] bg-black shadow-lg" />
          </div>
        ) : (
          <div className="mb-6 flex h-[240px] w-[240px] mx-auto items-center justify-center rounded-full border-2 border-dashed border-[#27413b] bg-[#101d1b]">
            <span className="text-[#9db4ad]">No image selected</span>
          </div>
        )}

        <div className="mb-4 text-sm text-[#d7c5b7]">{status || photoStatus}</div>

        {preview && (
          <div className="mb-6">
            <button type="button" onClick={() => { setSelectedFile(null); setPreview(null); setStatus(''); setError(null) }} className="mr-3 rounded-lg border border-[#27413b] bg-[#101d1b] px-4 py-2 text-sm font-medium text-white hover:border-[#b95d1d]">
              Retake / Choose Another Photo
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedFile}
          className="w-full rounded-lg bg-[#123c32] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#0d2a24] transition-colors"
        >
          {isSubmitting ? 'Processing face...' : 'Enroll Face'}
        </button>
      </div>
    </div>
  )
}
