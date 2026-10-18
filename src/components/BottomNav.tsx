import type { ReactNode } from 'react'
import { HomeIcon, InfoIcon } from './icons.tsx'
import './BottomNav.css'

export type Screen = 'home' | 'about'

type Props = {
  active: Screen
  onChange: (screen: Screen) => void
}

const TABS: { id: Screen; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'בית', icon: <HomeIcon /> },
  { id: 'about', label: 'אודות', icon: <InfoIcon /> },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="bottom-nav__tab"
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
