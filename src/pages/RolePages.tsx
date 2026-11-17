import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, BookOpen, Clock3, Mail, ShieldAlert, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageTitle, Alert, Field, primaryButtonClass, secondaryButtonClass, StatusPill } from '../components/common/UI'
import { useAuth } from '../contexts/AuthContext'
import { logout, requestPasswordReset } from '../services/auth/authService'
import { updateOwnProfile } from '../services/users/userService'
import { getFirebaseErrorMessage, sriLankanPhonePattern } from '../utils/validation'

export function StudentDashboard() {
  const { profile } = useAuth()
  return (
    <>
      <PageTitle eyebrow="Student workspace" title={`Welcome, ${profile?.fullName.split(' ')[0] || 'there'}!`} description="Your student account is ready. We’re preparing a simpler way to find your next place to call home." />
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#183b63]"><Sparkles size={14} /> Coming in a future release</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Your accommodation journey starts here.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Property discovery is not available yet. In the meantime, complete your profile so your account is ready for what’s next.</p>
            <Link to="/student/profile" className={`${primaryButtonClass} mt-5`}>Review your profile <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-center gap-3 rounded-xl bg-[#f7f9fc] p-4"><span className="grid size-10 place-items-center rounded-lg bg-white text-[#2b65a0]"><BadgeCheck size={19} /></span><div><p className="text-sm font-semibold text-slate-800">Account verified</p><p className="text-xs text-slate-500">Your email is confirmed</p></div></div>
            <div className="flex items-center gap-3 rounded-xl bg-[#f7f9fc] p-4"><span className="grid size-10 place-items-center rounded-lg bg-white text-[#2b65a0]"><BookOpen size={19} /></span><div><p className="text-sm font-semibold text-slate-800">Profile ready</p><p className="text-xs text-slate-500">Update details any time</p></div></div>
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-800">Keep your details up to date</p><p className="mt-1 text-sm leading-6 text-slate-500">Your contact information helps us keep your account accurate.</p><Link to="/student/profile" className="mt-3 inline-block text-sm font-semibold text-[#183b63]">Edit profile →</Link></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-800">Account security</p><p className="mt-1 text-sm leading-6 text-slate-500">Manage your sign-in and password settings.</p><Link to="/student/settings" className="mt-3 inline-block text-sm font-semibold text-[#183b63]">Account settings →</Link></div>
      </div>
    </>
  )
}

export function ProfilePage({ owner = false }: { owner?: boolean }) {
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.fullName || '')
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const phone = phoneNumber.replace(/[\s()-]/g, '')
    if (!fullName.trim()) return setError('Enter your full name.')
    if (!sriLankanPhonePattern.test(phone)) return setError('Enter a valid Sri Lankan mobile number.')
    if (!profile) return setError('Your account profile could not be loaded.')
    setBusy(true)
    try {
      await updateOwnProfile(profile.uid, fullName.trim(), phone)
      await refreshProfile()
      setMessage('Your profile has been updated.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow={owner ? 'Owner workspace' : 'Student workspace'} title="Your profile" description="Keep your contact details up to date. Your email address is managed through your sign-in account." />
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <form className="grid gap-5" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          {message && <Alert type="success">{message}</Alert>}
          <Field label="Full name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={100} />
          <Field label="Email address" type="email" value={profile?.email || ''} disabled />
          <Field label="Sri Lankan mobile number" type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
          <div><button className={primaryButtonClass} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </div>
    </>
  )
}

export function StudentSettingsPage() {
  const { profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function resetPassword() {
    if (!profile?.email) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await requestPasswordReset(profile.email)
      setMessage('A password reset link has been sent to your email.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Student workspace" title="Account settings" description="Manage your account sign-in and security." />
      <div className="max-w-2xl divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5 sm:px-7">
        {error && <div className="pt-5"><Alert>{error}</Alert></div>}
        {message && <div className="pt-5"><Alert type="success">{message}</Alert></div>}
        <div className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-[#2b65a0]"><Mail size={18} /></span><div><p className="text-sm font-semibold text-slate-800">Email address</p><p className="mt-1 text-sm text-slate-500">{profile?.email}</p></div></div>
          <StatusPill tone="green">Verified</StatusPill>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div><p className="text-sm font-semibold text-slate-800">Password</p><p className="mt-1 text-sm text-slate-500">Request a secure password reset link by email.</p></div>
          <button onClick={resetPassword} className={secondaryButtonClass} disabled={busy}>{busy ? 'Sending…' : 'Reset password'}</button>
        </div>
      </div>
    </>
  )
}

export function OwnerDashboard() {
  const { profile } = useAuth()
  return (
    <>
      <PageTitle eyebrow="Boarding owner workspace" title={`Welcome, ${profile?.fullName.split(' ')[0] || 'there'}`} description="Your owner account has been approved. Owner tools will become available in a future release." action={<StatusPill tone="green">Approved</StatusPill>} />
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 sm:p-9">
        <div className="flex max-w-2xl items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeCheck size={24} /></span>
          <div><h2 className="text-xl font-bold text-slate-900">Your account is approved</h2><p className="mt-2 text-sm leading-6 text-slate-500">You’re all set. Boarding management and listing tools are not part of this development stage, but your verified owner profile is ready.</p><Link className="mt-4 inline-block text-sm font-semibold text-[#183b63]" to="/owner/profile">Review your profile →</Link></div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-800">Account status</p><p className="mt-1 text-sm text-slate-500">Active and approved by the Boardmate team.</p><Link to="/owner/status" className="mt-3 inline-block text-sm font-semibold text-[#183b63]">View status →</Link></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-800">Owner profile</p><p className="mt-1 text-sm text-slate-500">Keep your personal contact details current.</p><Link to="/owner/profile" className="mt-3 inline-block text-sm font-semibold text-[#183b63]">Edit profile →</Link></div>
      </div>
    </>
  )
}

export function OwnerPendingPage() {
  return (
    <>
      <PageTitle eyebrow="Owner workspace" title="Your request is under review" description="Thank you for registering as a boarding owner. Your dashboard will unlock after an administrator reviews your account." action={<StatusPill tone="amber">Pending review</StatusPill>} />
      <div className="max-w-3xl rounded-2xl border border-amber-200 bg-white p-6 sm:p-9">
        <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800"><Clock3 size={23} /></span>
          <div><h2 className="text-lg font-bold text-slate-900">We’re reviewing your registration</h2><p className="mt-2 text-sm leading-6 text-slate-500">You can check your request status and update your profile while you wait. Pending owners cannot access owner dashboard functionality.</p><Link className="mt-4 inline-block text-sm font-semibold text-[#183b63]" to="/owner/status">View account status →</Link></div>
        </div>
      </div>
    </>
  )
}

export function OwnerStatusPage() {
  const { profile } = useAuth()
  const rejected = profile?.approvalStatus === 'rejected'
  const suspended = profile?.accountStatus === 'suspended'
  const approved = profile?.approvalStatus === 'approved' && !suspended
  return (
    <>
      <PageTitle eyebrow="Owner workspace" title="Account status" description="Here is the current status of your boarding owner account." action={<StatusPill tone={suspended || rejected ? 'red' : approved ? 'green' : 'amber'}>{suspended ? 'Suspended' : profile?.approvalStatus || 'Unknown'}</StatusPill>} />
      <div className={`max-w-3xl rounded-2xl border bg-white p-6 sm:p-9 ${suspended || rejected ? 'border-rose-200' : approved ? 'border-emerald-200' : 'border-amber-200'}`}>
        <div className="flex items-start gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${suspended || rejected ? 'bg-rose-50 text-rose-700' : approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{suspended || rejected ? <ShieldAlert size={23} /> : approved ? <BadgeCheck size={23} /> : <Clock3 size={23} />}</span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{suspended ? 'This account has been suspended' : rejected ? 'Your registration was not approved' : approved ? 'Your account is approved' : 'Your request is awaiting review'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{suspended ? 'Access to owner features is disabled. Please contact the platform administrator for assistance.' : rejected ? 'Your account cannot access owner features. Review the administrator’s note below or contact support if you have questions.' : approved ? 'Your owner account is active. Boarding management tools will be available in a future release.' : 'An administrator will review your registration. Owner dashboard access is available only after approval.'}</p>
            {rejected && profile?.rejectionReason && <div className="mt-4 rounded-lg bg-rose-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-rose-800">Administrator’s reason</p><p className="mt-1 text-sm leading-6 text-rose-900">{profile.rejectionReason}</p></div>}
            <div className="mt-5 flex flex-wrap gap-3">
              {approved && <Link to="/owner/profile" className={secondaryButtonClass}>Review my profile</Link>}
              <a href="mailto:support@boardmate.lk" className={secondaryButtonClass}>Contact support</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function AccountSuspendedPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  async function handleSignOut() {
    try {
      await logout()
      navigate('/')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-20 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-700"><ShieldAlert size={26} /></span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Account suspended</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Protected features are unavailable for this account. Contact support if you believe this is an error.</p>
      {error && <div className="mt-4 text-left"><Alert>{error}</Alert></div>}
      <a href="mailto:support@boardmate.lk" className={`${secondaryButtonClass} mt-5`}>Contact support</a>
      <button onClick={handleSignOut} className={`${secondaryButtonClass} ml-2 mt-5`}>Sign out</button>
    </main>
  )
}
