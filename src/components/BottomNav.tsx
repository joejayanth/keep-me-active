import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Plus, BarChart3, Users, User } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/log', icon: Plus, label: 'Log', accent: true },
  { path: '/buddies', icon: Users, label: 'Buddies' },
  { path: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light flex items-center justify-around px-2 py-2 safe-area-pb z-50">
      {tabs.map((tab) => {
        const active = tab.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(tab.path)
        const Icon = tab.icon

        if (tab.accent) {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center -mt-5"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <span className="text-[10px] mt-0.5 text-gray-400">{tab.label}</span>
            </button>
          )
        }

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <Icon className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-500'}`} />
            <span className={`text-[10px] ${active ? 'text-primary' : 'text-gray-500'}`}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
