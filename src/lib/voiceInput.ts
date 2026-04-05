import type { Exercise } from './types'

// ── Parse spoken workout text into structured exercise data ──

export function parseVoiceInput(transcript: string): Exercise[] {
  const exercises: Exercise[] = []
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

  const setsRepsMatch = text.match(/(\d+)\s*(?:x|by|sets?\s*(?:of)?)\s*(\d+)(?:\s*reps?)?/)
  if (setsRepsMatch) {
    exercise.sets = parseInt(setsRepsMatch[1])
    exercise.reps = parseInt(setsRepsMatch[2])
    text = text.replace(setsRepsMatch[0], '').trim()
  }

  if (!exercise.sets) {
    const setsMatch = text.match(/(\d+)\s*sets?/)
    if (setsMatch) {
      exercise.sets = parseInt(setsMatch[1])
      text = text.replace(setsMatch[0], '').trim()
    }
  }

  if (!exercise.reps) {
    const repsMatch = text.match(/(\d+)\s*reps?/)
    if (repsMatch) {
      exercise.reps = parseInt(repsMatch[1])
      text = text.replace(repsMatch[0], '').trim()
    }
  }

  const weightMatch = text.match(/(?:at\s+)?(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg|kilos?|kgs?)/)
  if (weightMatch) {
    exercise.weight = parseFloat(weightMatch[1])
    exercise.weightUnit = weightMatch[2].startsWith('k') ? 'kg' : 'lbs'
    text = text.replace(weightMatch[0], '').trim()
  }

  const durationMatch = text.match(/(\d+)\s*(?:minutes?|mins?)/)
  if (durationMatch) {
    exercise.duration = parseInt(durationMatch[1])
    text = text.replace(durationMatch[0], '').trim()
  }

  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:k\b|km|kilometers?|miles?)/)
  if (distanceMatch) {
    exercise.distance = parseFloat(distanceMatch[1])
    text = text.replace(distanceMatch[0], '').trim()
  }

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

// ── Friendly error messages ──

export function friendlyVoiceError(errorCode: string): { message: string; hint: string } {
  switch (errorCode) {
    case 'network':
      return {
        message: 'Connection error',
        hint: 'Speech recognition needs an internet connection. Check your connection and try again.',
      }
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        message: 'Microphone access blocked',
        hint: 'Please allow microphone access in your browser settings, then try again.',
      }
    case 'audio-capture':
      return {
        message: 'Microphone not found',
        hint: 'Make sure a microphone is connected and accessible.',
      }
    case 'no-speech':
      return {
        message: 'No speech detected',
        hint: 'Tap the mic button and speak clearly. Try again!',
      }
    case 'aborted':
      return {
        message: 'Stopped',
        hint: '',
      }
    case 'language-not-supported':
      return {
        message: 'Language not supported',
        hint: 'Try switching your device language to English.',
      }
    default:
      return {
        message: 'Voice input failed',
        hint: `Error: ${errorCode}. Try again or add exercises manually.`,
      }
  }
}

// ── Web Speech API wrapper ──

export interface VoiceRecognitionCallbacks {
  onResult: (transcript: string) => void
  onEnd: () => void
  onError: (code: string) => void
  onStart?: () => void
}

export function startVoiceRecognition(callbacks: VoiceRecognitionCallbacks): (() => void) | null {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    callbacks.onError('unsupported')
    return null
  }

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  let gotResult = false

  recognition.onstart = () => callbacks.onStart?.()

  recognition.onresult = (event: any) => {
    gotResult = true
    const transcript = event.results[0][0].transcript
    callbacks.onResult(transcript)
  }

  recognition.onend = () => {
    if (!gotResult) {
      // Ended without a result and no error — treat as no-speech
      // (happens on some browsers when recognition times out silently)
    }
    callbacks.onEnd()
  }

  recognition.onerror = (event: any) => {
    // 'aborted' fires when we manually call stop() — don't treat as error
    if (event.error !== 'aborted') {
      callbacks.onError(event.error)
    }
    callbacks.onEnd()
  }

  try {
    recognition.start()
  } catch (e) {
    callbacks.onError('start-failed')
    return null
  }

  return () => {
    try { recognition.abort() } catch (_) {}
  }
}

export function isSpeechSupported(): boolean {
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}
