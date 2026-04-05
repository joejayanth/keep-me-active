import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { findUserByShareCode, sendBuddyRequest, acceptBuddyRequest, removeBuddy, getMyConnections } from '../lib/workouts'
import type { BuddyConnection } from '../lib/types'
import { Users, UserPlus, Check, X, Eye, Copy, CheckCheck } from 'lucide-react'

export default function BuddiesPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [connections, setConnections] = useState<BuddyConnection[]>([])
  const [shareCode, setShareCode] = useState('')
  const [role, setRole] = useState<'buddy' | 'coach'>('buddy')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  const loadConnections = async () => {
    if (!profile) return
    const conns = await getMyConnections(profile.uid)
    setConnections(conns)
    setLoading(false)
  }

  useEffect(() => { loadConnections() }, [profile?.uid])

  const handleAdd = async () => {
    if (!profile || !shareCode.trim()) return
    setError('')
    setSuccess('')

    const found = await findUserByShareCode(shareCode.trim())
    if (!found) {
      setError('No user found with that code')
      return
    }
    if (found.uid === profile.uid) {
      setError("That's your own code!")
      return
    }

    const existing = connections.find(
      c => (c.ownerId === profile.uid && c.buddyId === found.uid) ||
           (c.buddyId === profile.uid && c.ownerId === found.uid)
    )
    if (existing) {
      setError('Already connected with this user')
      return
    }

    await sendBuddyRequest(profile, found, role)
    setSuccess(`Request sent to ${found.displayName}!`)
    setShareCode('')
    await loadConnections()
  }

  const handleAccept = async (id: string) => {
    await acceptBuddyRequest(id)
    await loadConnections()
  }

  const handleRemove = async (id: string) => {
    await removeBuddy(id)
    await loadConnections()
  }

  const copyCode = () => {
    if (profile?.shareCode) {
      navigator.clipboard.writeText(profile.shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const pendingForMe = connections.filter(
    c => c.buddyId === profile?.uid && c.status === 'pending'
  )
  const active = connections.filter(c => c.status === 'accepted')
  const pendingSent = connections.filter(
    c => c.ownerId === profile?.uid && c.status === 'pending'
  )

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-white mb-4">Buddies & Coaches</h1>

      {/* My Share Code */}
      <div className="bg-surface rounded-2xl p-4 mb-4">
        <p className="text-gray-400 text-sm mb-2">Your share code</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface-light rounded-xl px-4 py-3 text-center">
            <span className="text-white text-2xl font-mono font-bold tracking-widest">
              {profile?.shareCode || '------'}
            </span>
          </div>
          <button onClick={copyCode} className="bg-primary/20 text-primary p-3 rounded-xl">
            {copied ? <CheckCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">Share this code with friends so they can add you</p>
      </div>

      {/* Add Buddy */}
      <div className="bg-surface rounded-2xl p-4 mb-4">
        <p className="text-white font-semibold text-sm mb-3">Add a Buddy or Coach</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setRole('buddy')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              role === 'buddy' ? 'bg-primary text-white' : 'bg-surface-light text-gray-400'
            }`}
          >
            Gym Buddy
          </button>
          <button
            onClick={() => setRole('coach')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              role === 'coach' ? 'bg-accent-orange text-white' : 'bg-surface-light text-gray-400'
            }`}
          >
            Coach (view only)
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter share code"
            value={shareCode}
            onChange={e => setShareCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 bg-surface-light text-white px-4 py-3 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center uppercase tracking-widest"
          />
          <button
            onClick={handleAdd}
            className="bg-primary text-white px-4 rounded-xl"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
        {error && <p className="text-accent-red text-xs mt-2">{error}</p>}
        {success && <p className="text-accent-green text-xs mt-2">{success}</p>}
        <p className="text-gray-500 text-xs mt-2">
          {role === 'buddy' ? 'Buddies can see each other\'s workouts' : 'Coaches can only view your workouts, not edit'}
        </p>
      </div>

      {/* Pending Requests for Me */}
      {pendingForMe.length > 0 && (
        <div className="mb-4">
          <h3 className="text-white font-semibold text-sm mb-2">Pending Requests</h3>
          <div className="space-y-2">
            {pendingForMe.map(c => (
              <div key={c.id} className="bg-surface rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{c.ownerName}</p>
                  <p className="text-gray-400 text-xs">wants to add you as {c.role}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(c.id!)} className="bg-accent-green/20 text-accent-green p-2 rounded-lg">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRemove(c.id!)} className="bg-accent-red/20 text-accent-red p-2 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Connections */}
      {active.length > 0 && (
        <div className="mb-4">
          <h3 className="text-white font-semibold text-sm mb-2">Connected</h3>
          <div className="space-y-2">
            {active.map(c => {
              const isOwner = c.ownerId === profile?.uid
              const name = isOwner ? c.buddyName : c.ownerName
              const viewId = isOwner ? c.buddyId : c.ownerId

              return (
                <div key={c.id} className="bg-surface rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{name}</p>
                      <p className="text-gray-400 text-xs capitalize">{c.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/view/${viewId}`)}
                      className="bg-primary/20 text-primary p-2 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(c.id!)}
                      className="bg-surface-light text-gray-400 p-2 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending Sent */}
      {pendingSent.length > 0 && (
        <div className="mb-4">
          <h3 className="text-gray-400 text-sm mb-2">Sent (waiting for acceptance)</h3>
          <div className="space-y-2">
            {pendingSent.map(c => (
              <div key={c.id} className="bg-surface rounded-xl p-3 flex items-center justify-between opacity-60">
                <p className="text-white text-sm">{c.buddyName}</p>
                <button onClick={() => handleRemove(c.id!)} className="text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && pendingForMe.length === 0 && pendingSent.length === 0 && !loading && (
        <div className="bg-surface rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No buddies yet. Share your code or add someone above!</p>
        </div>
      )}
    </div>
  )
}
