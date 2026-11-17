import { useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock3,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../../services/auth/authService'
import { useAuth } from '../../contexts/AuthContext'
import { Alert, Brand } from '../common/UI'
import { getFirebaseErrorMessage } from '../../utils/validation'

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-blue-50 text-[#183b63]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export function AppLayout() {
  const { profile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  const role = profile?.role
  const nav: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = role === 'admin'
    ? [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/admin/requests', label: 'Approval requests', icon: ClipboardList },
        { to: '/admin/users', label: 'Registered users', icon: Users },
        { to: '/admin/approved', label: 'Approved owners', icon: CheckCircle2 },
        { to: '/admin/rejected', label: 'Rejected owners', icon: Building2 },
      ]
    : role === 'owner'
      ? profile?.accountStatus === 'active' && profile.approvalStatus === 'approved'
        ? [
          { to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/owner/properties/new', label: 'Add New Property', icon: Building2 },
          { to: '/owner/properties', label: 'My Properties', icon: ClipboardList },
          { to: '/owner/profile', label: 'Profile', icon: CircleUserRound },
          { to: '/owner/status', label: 'Account status', icon: Shield },
          ]
        : profile?.accountStatus === 'active' && profile.approvalStatus === 'pending'
          ? [
              { to: '/owner/pending', label: 'Approval status', icon: Clock3 },
              { to: '/owner/status', label: 'Account status', icon: Shield },
            ]
          : [{ to: '/owner/status', label: 'Account status', icon: Shield }]
      : [
          { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/student/profile', label: 'My profile', icon: CircleUserRound },
          { to: '/student/settings', label: 'Account settings', icon: Shield },
        ]

  async function handleLogout() {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      setLogoutError(getFirebaseErrorMessage(error))
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5">
        <Brand />
        <button className="rounded-md p-2 text-slate-500 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>
      <div className="px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{role} workspace</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">{profile?.fullName}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkStyle} onClick={() => setMobileOpen(false)}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        {logoutError && <div className="mb-2"><Alert>{logoutError}</Alert></div>}
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100" onClick={handleLogout}>
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/30" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <span className="hidden text-sm font-medium text-slate-500 sm:block">A trusted place to find your next home</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-sm font-medium text-slate-700 sm:block">{profile?.email}</span>
            <div className="grid size-9 place-items-center rounded-full bg-blue-50 text-sm font-bold text-[#183b63]">{profile?.fullName?.charAt(0).toUpperCase()}</div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10"><Outlet /></main>
      </div>
    </div>
  )
}
