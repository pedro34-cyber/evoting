import { useNavigate } from 'react-router-dom'

export default function BackButton({ label = 'Back', className = '' }: { label?: string; className?: string }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`inline-flex items-center justify-center rounded-lg border border-[#2f3b3a] bg-[#101714] px-4 py-2 text-sm font-medium text-[#f5efe8] shadow-sm transition hover:border-[#b95d1d] hover:text-[#f9d8b5] ${className}`}
    >
      {label}
    </button>
  )
}
