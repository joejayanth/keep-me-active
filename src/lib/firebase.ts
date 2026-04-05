import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAOicS_eBRceKyPWJi7Ouy48S64YR95EO8",
  authDomain: "keep-me-active.firebaseapp.com",
  projectId: "keep-me-active",
  storageBucket: "keep-me-active.firebasestorage.app",
  messagingSenderId: "206720484081",
  appId: "1:206720484081:web:a3396d167c5d3a8cf19f50",
  measurementId: "G-5D73CEGXZQ"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
