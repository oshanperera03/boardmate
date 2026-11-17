import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types/user'
import { Spinner } from '../common/UI'

function homePath(role: UserRole, approvalStatus: string, accountStatus: string): string {
  if (accountStatus === 'suspended') return role === 'owner' ? '/owner/status' : '/account-suspended'
  if (role === 'owner' && approvalStatus === 'pending') return '/owner/pending'
  if (role === 'owner' && approvalStatus === 'rejected') return '/owner/status'
  if (role === 'admin') return '/admin'
  return role === 'student' ? '/student' : '/owner'
}

export function ProtectedRoute({
  role,
  ownerGate,
}: {
  role: UserRole
  ownerGate?: 'approved' | 'pending' | 'status'
}) {
  const { authUser, profile, loading, profileError } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!authUser) {
    const loginPath = role === 'admin' ? '/admin/login' : role === 'owner' ? '/owner/login' : '/login'
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }
  if (profileError || !profile) {
    return (
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-xl font-bold text-slate-900">We couldn’t verify your account</h1>
        <p className="mt-2 text-sm text-slate-600">{profileError || 'Your account profile is unavailable.'}</p>
      </main>
    )
  }
  if (!authUser.emailVerified) return <Navigate to="/verify-email" replace />
  if (profile.accountStatus === 'suspended') {
    if (profile.role === 'owner' && ownerGate === 'status') return <Outlet />
    return <Navigate to={profile.role === 'owner' ? '/owner/status' : '/account-suspended'} replace />
  }
  if (profile.role !== role) return <Navigate to={homePath(profile.role, profile.approvalStatus, profile.accountStatus)} replace />
  if (profile.role === 'owner') {
    if (profile.approvalStatus === 'pending' && ownerGate !== 'pending' && ownerGate !== 'status') return <Navigate to="/owner/pending" replace />
    if (profile.approvalStatus === 'rejected' && ownerGate !== 'status') return <Navigate to="/owner/status" replace />
    if (profile.approvalStatus === 'approved' && ownerGate !== 'approved' && ownerGate !== 'status') return <Navigate to="/owner" replace />
    if (!profile.approvalStatus || profile.approvalStatus === 'not_required') return <Navigate to="/owner/status" replace />
  }
  return <Outlet />
}

export function AuthenticatedRedirect() {
  const { authUser, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!authUser || !profile) return <Outlet />
  if (!authUser.emailVerified) return <Navigate to="/verify-email" replace />
  return <Navigate to={homePath(profile.role, profile.approvalStatus, profile.accountStatus)} replace />
}
