import type { Exercise } from './types'

// Parse spoken workout text into structured exercise data
export function parseVoiceInput(transcript: string): Exercise[] {
  const exercises: Exercise[] = []
  // Split by "and", "then", commas, or periods
  const parts = transcript
    .toLowerCase()
    .split(/\s*(?:,|\.|\band\b|\bthen\b)\s*/)
    .filter(Boolean)

  for (const part of parts) {
    const exercise = parseSingleExercise(part.trim())
    if (exercise) exercises.push(exercise)
  }

  return exercises
}

function parseSingleExercise(text: string): Exercise | null {
  if (!text || text.length < 3) return null

  const exercise: Exercise = { name: '' }

  // Match patterns like "3 sets of 10 reps bench press at 135 lbs"
  // or "bench press 3x10 at 60 kg"
  // or "ran 5k in 30 minutes"

  // Extract sets x reps pattern: "3x10", "3 by 10", "3 sets of 10"
  const setsRepsMatch = text.match(/(\d+)\s*(?:x|by|sets?\s*(?:of)?)\s*(\d+)(?:\s*reps?)?/)
  if (setsRepsMatch) {
    exercise.sets = parseInt(setsRepsMatch[1])
    exercise.reps = parseInt(setsRepsMatch[2])
    text = text.replace(setsRepsMatch[0], '').trim()
  }

  // Extract just sets: "3 sets"
  if (!exercise.sets) {
    const setsMatch = text.match(/(\d+)\s*sets?/)
    if (setsMatch) {
      exercise.sets = parseInt(setsMatch[1])
      text = text.replace(setsMatch[0], '').trim()
    }
  }

  // Extract just reps: "10 reps"
  if (!exercise.reps) {
    const repsMatch = text.match(/(\d+)\s*reps?/)
    if (repsMatch) {
      exercise.reps = parseInt(repsMatch[1])
      text = text.replace(repsMatch[0], '').trim()
    }
  }

  // Extract weight: "135 lbs", "60 kg", "at 135 pounds"
  const weightMatch = text.match(/(?:at\s+)?(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg|kilos?|kgs?)/)
  if (weightMatch) {
    exercise.weight = parseFloat(weightMatch[1])
    exercise.weightUnit = weightMatch[2].startsWith('k') ? 'kg' : 'lbs'
    text = text.replace(weightMatch[0], '').trim()
  }

  // Extract duration: "30 minutes", "45 min"
  const durationMatch = text.match(/(\d+)\s*(?:minutes?|mins?)/)
  if (durationMatch) {
    exercise.duration = parseInt(durationMatch[1])
    text = text.replace(durationMatch[0], '').trim()
  }

  // Extract distance: "5k", "5 km", "3 miles"
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:k\b|km|kilometers?|miles?)/)
  if (distanceMatch) {
    exercise.distance = parseFloat(distanceMatch[1])
    text = text.replace(distanceMatch[0], '').trim()
  }

  // Remaining text is the exercise name
  const name = text
    .replace(/\b(at|for|with|of|did|do|doing)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (name) {
    exercise.name = name.charAt(0).toUpperCase() + name.slice(1)
  } else if (exercise.sets || exercise.reps || exercise.weight || exercise.duration || exercise.distance) {
    exercise.name = 'Exercise'
  } else {
    return null
  }

  return exercise
}

// Web Speech API wrapper
export function startVoiceRecognition(
  onResult: (transcript: string) => void,
  onEnd: () => void,
  onError: (error: string) => void
): (() => void) | null {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    onError('Speech recognition is not supported in this browser')
    return null
  }

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript
    onResult(transcript)
  }

  recognition.onend = onEnd
  recognition.onerror = (event: any) => {
    onError(event.error === 'no-speech' ? 'No speech detected. Try again.' : `Error: ${event.error}`)
    onEnd()
  }

  recognition.start()
  return () => recognition.stop()
}

export function isSpeechSupported(): boolean {
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}
