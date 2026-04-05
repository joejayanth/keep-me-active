import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { saveWorkout, getWorkoutByDate, deleteWorkout } from '../lib/workouts'
import { parseVoiceInput, startVoiceRecognition, isSpeechSupported } from '../lib/voiceInput'
import type { Exercise, WorkoutLog, WorkoutType } from '../lib/types'
import { WORKOUT_TYPES, COMMON_EXERCISES } from '../lib/types'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Mic, MicOff, Plus, Trash2, BedDouble, Save, X } from 'lucide-react'

export default function LogWorkoutPage() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  const selectedDate = date || format(new Date(), 'yyyy-MM-dd')
  const displayDate = format(parseISO(selectedDate), 'EEEE, MMM d, yyyy')

  const [type, setType] = useState<'workout' | 'rest'>('workout')
  const [workoutType, setWorkoutType] = useState<WorkoutType>('Push')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [saving, setSaving] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getWorkoutByDate(profile.uid, selectedDate).then(log => {
      if (log) {
        setType(log.type)
        setWorkoutType((log.workoutType as WorkoutType) || 'Custom')
        setExercises(log.exercises || [])
        setNotes(log.notes || '')
        setDuration(log.duration?.toString() || '')
        setExistingId(log.id || null)
      }
      setLoading(false)
    })
  }, [profile?.uid, selectedDate])

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10 }])
  }

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], [field]: value }
    setExercises(updated)
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const addSuggestedExercise = (name: string) => {
    if (exercises.some(e => e.name === name)) return
    setExercises([...exercises, { name, sets: 3, reps: 10 }])
  }

  const handleVoice = () => {
    if (isRecording) return

    setIsRecording(true)
    setVoiceTranscript('')

    const stop = startVoiceRecognition(
      (transcript) => {
        setVoiceTranscript(transcript)
        const parsed = parseVoiceInput(transcript)
        if (parsed.length > 0) {
          setExercises(prev => [...prev, ...parsed])
        }
      },
      () => setIsRecording(false),
      (error) => {
        setVoiceTranscript(error)
        setIsRecording(false)
      }
    )

    if (!stop) setIsRecording(false)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    const log: WorkoutLog = {
      id: existingId || `${profile.uid}_${selectedDate}`,
      userId: profile.uid,
      date: selectedDate,
      type,
      workoutType: type === 'workout' ? workoutType : undefined,
      exercises: type === 'workout' ? exercises.filter(e => e.name.trim()) : [],
      notes: notes.trim() || undefined,
      duration: duration ? parseInt(duration) : undefined,
      createdAt: Date.now(),
    }

    await saveWorkout(log)
    await refreshProfile()
    setSaving(false)
    navigate('/')
  }

  const handleDelete = async () => {
    if (!existingId || !profile) return
    await deleteWorkout(existingId, profile.uid)
    await refreshProfile()
    navigate('/')
  }

  const suggestions = COMMON_EXERCISES[workoutType] || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {existingId ? 'Edit Log' : 'Log Workout'}
          </h1>
          <p className="text-gray-400 text-sm">{displayDate}</p>
        </div>
      </div>

      {/* Workout vs Rest Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType('workout')}
          className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            type === 'workout'
              ? 'bg-primary text-white'
              : 'bg-surface text-gray-400 border border-surface-light'
          }`}
        >
          <span className="text-lg">💪</span> Workout
        </button>
        <button
          onClick={() => setType('rest')}
          className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            type === 'rest'
              ? 'bg-accent-orange text-white'
              : 'bg-surface text-gray-400 border border-surface-light'
          }`}
        >
          <BedDouble className="w-5 h-5" /> Rest Day
        </button>
      </div>

      {type === 'rest' ? (
        <div className="bg-surface rounded-2xl p-6 text-center mb-4">
          <BedDouble className="w-16 h-16 text-accent-orange mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Rest & Recovery</p>
          <p className="text-gray-400 text-sm">Rest days are important for muscle recovery and growth. Your streak will continue!</p>
        </div>
      ) : (
        <>
          {/* Workout Type */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Workout Type</label>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map(wt => (
                <button
                  key={wt}
                  onClick={() => setWorkoutType(wt)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    workoutType === wt
                      ? 'bg-primary text-white'
                      : 'bg-surface text-gray-400 border border-surface-light'
                  }`}
                >
                  {wt}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Input */}
          {isSpeechSupported() && (
            <div className="mb-4">
              <button
                onClick={handleVoice}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                  isRecording
                    ? 'bg-accent-red text-white voice-pulse'
                    : 'bg-surface text-gray-300 border border-surface-light'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5" /> Listening...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" /> Speak your workout
                  </>
                )}
              </button>
              {voiceTranscript && (
                <p className="text-gray-400 text-xs mt-2 italic">"{voiceTranscript}"</p>
              )}
            </div>
          )}

          {/* Suggested Exercises */}
          {suggestions.length > 0 && (
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Quick Add</label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => addSuggestedExercise(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      exercises.some(e => e.name === s)
                        ? 'bg-accent-green/20 text-accent-green'
                        : 'bg-surface-light text-gray-300'
                    }`}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exercises List */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-400 text-sm">Exercises</label>
              <button onClick={addExercise} className="text-primary text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="space-y-3">
              {exercises.map((ex, i) => (
                <div key={i} className="bg-surface rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Exercise name"
                      value={ex.name}
                      onChange={e => updateExercise(i, 'name', e.target.value)}
                      className="flex-1 bg-transparent text-white text-sm font-medium placeholder-gray-500 focus:outline-none"
                    />
                    <button onClick={() => removeExercise(i)} className="text-gray-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-gray-500 text-[10px] block mb-0.5">Sets</label>
                      <input
                        type="number"
                        value={ex.sets || ''}
                        onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || undefined)}
                        className="w-full bg-surface-light text-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-gray-500 text-[10px] block mb-0.5">Reps</label>
                      <input
                        type="number"
                        value={ex.reps || ''}
                        onChange={e => updateExercise(i, 'reps', parseInt(e.target.value) || undefined)}
                        className="w-full bg-surface-light text-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-gray-500 text-[10px] block mb-0.5">Weight</label>
                      <input
                        type="number"
                        value={ex.weight || ''}
                        onChange={e => updateExercise(i, 'weight', parseFloat(e.target.value) || undefined)}
                        className="w-full bg-surface-light text-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-16">
                      <label className="text-gray-500 text-[10px] block mb-0.5">Unit</label>
                      <select
                        value={ex.weightUnit || 'lbs'}
                        onChange={e => updateExercise(i, 'weightUnit', e.target.value)}
                        className="w-full bg-surface-light text-white text-sm px-1 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="lbs">lbs</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  </div>
                  {/* Duration & Distance for cardio */}
                  {(workoutType === 'Cardio' || ex.duration || ex.distance) && (
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <label className="text-gray-500 text-[10px] block mb-0.5">Duration (min)</label>
                        <input
                          type="number"
                          value={ex.duration || ''}
                          onChange={e => updateExercise(i, 'duration', parseInt(e.target.value) || undefined)}
                          className="w-full bg-surface-light text-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-gray-500 text-[10px] block mb-0.5">Distance (km)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ex.distance || ''}
                          onChange={e => updateExercise(i, 'distance', parseFloat(e.target.value) || undefined)}
                          className="w-full bg-surface-light text-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {exercises.length === 0 && (
              <button
                onClick={addExercise}
                className="w-full border border-dashed border-surface-light rounded-xl py-8 text-gray-500 text-sm"
              >
                Tap + Add or use voice input to add exercises
              </button>
            )}
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-1 block">Total Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 60"
              className="w-full bg-surface text-white px-4 py-3 rounded-xl border border-surface-light focus:border-primary focus:outline-none"
            />
          </div>
        </>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How did it feel?"
          rows={2}
          className="w-full bg-surface text-white px-4 py-3 rounded-xl border border-surface-light focus:border-primary focus:outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {existingId && (
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-red/10 text-accent-red font-medium"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : existingId ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  )
}
