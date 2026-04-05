import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LogWorkoutPage from './pages/LogWorkoutPage'
import AnalyticsPage from './pages/AnalyticsPage'
import BuddiesPage from './pages/BuddiesPage'
import ProfilePage from './pages/ProfilePage'
import ViewBuddyPage from './pages/ViewBuddyPage'
import BottomNav from './components/BottomNav'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/log" element={<LogWorkoutPage />} />
          <Route path="/log/:date" element={<LogWorkoutPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/buddies" element={<BuddiesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/view/:userId" element={<ViewBuddyPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
