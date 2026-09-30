import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { apiBase, networkMessage, responseData } from '../lib/api'

export default function RequireAccount({ children, admin = false, enrollment = false }: { children: React.ReactNode; admin?: boolean; enrollment?: boolean }) {
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState('')
  const [unauthorized, setUnauthorized] = useState(false)
  const location = useLocation()
  useEffect(() => {
    let live = true
    setProfile(null)
    const token = localStorage.getItem('access_token')
    if (!token) { setUnauthorized(true); return }
    fetch(apiBase + '/api/student/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => { if (res.status === 401) { if (live) setUnauthorized(true); return null }; return responseData(res) })
      .then(data => { if (live) setProfile(data) })
      .catch(err => { if (live) setError(networkMessage(err)) })
    return () => { live = false }
  }, [location.pathname])
  if (unauthorized) return <Navigate to="/login" replace />
  if (error) return <div role="alert" className="p-8 text-white">{error} <button onClick={() => window.location.reload()}>Retry</button></div>
  if (!profile) return <div className="p-8 text-white">Checking account...</div>
  if (profile.is_admin && !admin) return <Navigate to="/admin" replace />
  if (!profile.is_admin && admin) return <Navigate to={profile.has_enrolled ? '/dashboard' : '/enroll'} replace />
  if (!profile.is_admin && !profile.has_enrolled && !enrollment) return <Navigate to="/enroll" replace />
  if (enrollment && profile.has_enrolled) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
