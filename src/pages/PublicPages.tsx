import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, BadgeCheck, Building2, GraduationCap, House, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login, loginAsAdmin, logout, register, requestPasswordReset, resendVerification } from '../services/auth/authService'
import { getFirebaseErrorMessage, emailPattern, sriLankanPhonePattern, strongPasswordPattern } from '../utils/validation'
import { Alert, Brand, Field, primaryButtonClass, secondaryButtonClass, Spinner } from '../components/common/UI'

function AuthCard({ children, title, description, admin = false }: { children: ReactNode; title: string; description: string; admin?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="mx-auto flex h-[76px] max-w-7xl items-center px-5 sm:px-8"><Brand /></header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-16 lg:pb-24">
        <div className="hidden lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#183b63]">
            <ShieldCheck size={15} /> A better way to find your place
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.12] tracking-tight text-slate-950">
            Find a place that feels like <span className="text-[#2b65a0]">home.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-500">A trusted community connecting Sri Lankan students with boarding owners.</p>
          <div className="mt-10 flex items-center gap-4 text-sm text-slate-600">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-[#2b65a0] shadow-sm"><BadgeCheck size={19} /></span>
            {admin ? 'Secure access for authorized administrators only' : 'Your account and information are kept secure'}
          </div>
        </div>
        <section className="mx-auto w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_42px_rgba(27,52,84,0.06)] sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          {children}
        </section>
      </main>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign in</Link>
          <Link to="/register" className={primaryButtonClass}>Join as a student</Link>
        </nav>
      </header>
      <main>
        <section className="relative overflow-hidden bg-[#f4f8fc]">
          <div className="absolute -right-32 -top-32 size-[520px] rounded-full border-[80px] border-white/60" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#183b63]">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Made for campus life in Sri Lanka
              </span>
              <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-6xl">
                Your next chapter starts with a <span className="text-[#2b65a0]">place to stay.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                A thoughtful, trusted community for students looking for accommodation and boarding owners ready to welcome them.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className={primaryButtonClass}>Get started as a student <ArrowRight size={17} /></Link>
                <Link to="/owner/register" className={secondaryButtonClass}>I’m a boarding owner</Link>
              </div>
              <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={17} className="text-emerald-600" /> Owner accounts are reviewed for community trust.</div>
            </div>
            <div className="hidden lg:block">
              <div className="relative mx-auto max-w-[440px] rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_30px_90px_rgba(35,78,125,0.12)]">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">A community built on trust</p><p className="mt-1 text-lg font-bold text-slate-900">Room to feel at home</p></div>
                  <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-[#2b65a0]"><House size={22} /></span>
                </div>
                <div className="mt-6 rounded-2xl bg-[#eaf2fa] p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-white text-[#2b65a0]"><GraduationCap size={22} /></span>
                    <div><p className="text-sm font-bold text-slate-800">For students</p><p className="text-xs text-slate-500">A fresh start, made simpler</p></div>
                    <BadgeCheck className="ml-auto text-emerald-600" size={19} />
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-amber-50 text-amber-700"><Building2 size={21} /></span>
                    <div><p className="text-sm font-bold text-slate-800">For boarding owners</p><p className="text-xs text-slate-500">Join a student-first community</p></div>
                    <ShieldCheck className="ml-auto text-[#2b65a0]" size={19} />
                  </div>
                </div>
                <p className="mt-5 text-center text-xs text-slate-400">The platform is growing — accommodation discovery is coming soon.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">One community, two journeys</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">A more confident way to get started</h2>
            <p className="mt-3 leading-7 text-slate-500">Create your account today. Student accommodation discovery is coming in a future release.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-6 sm:p-8">
              <GraduationCap className="text-[#2b65a0]" size={24} /><h3 className="mt-4 text-lg font-bold text-slate-900">Looking for a boarding?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Set up your student account and profile. We’ll make it easier to find your next place as the platform grows.</p>
              <Link to="/register" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#183b63]">Create a student account <ArrowRight size={16} /></Link>
            </article>
            <article className="rounded-2xl border border-slate-200 p-6 sm:p-8">
              <Building2 className="text-amber-700" size={24} /><h3 className="mt-4 text-lg font-bold text-slate-900">Welcome students to your place</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Register your interest. Our team reviews owner accounts before dashboard access is enabled.</p>
              <Link to="/owner/register" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#183b63]">Register as an owner <ArrowRight size={16} /></Link>
            </article>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Boardmate · <Link to="/admin/login" className="hover:text-[#183b63]">Administrator access</Link></p>
      </footer>
    </div>
  )
}

export function RegistrationPage({ owner = false }: { owner?: boolean }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const fullName = String(data.get('fullName') || '').trim()
    const email = String(data.get('email') || '').trim()
    const phoneNumber = String(data.get('phoneNumber') || '').replace(/[\s()-]/g, '')
    if (!fullName || !email || !phoneNumber || !password || !confirmation) return setError('Please complete every field.')
    if (!emailPattern.test(email)) return setError('Enter a valid email address.')
    if (!sriLankanPhonePattern.test(phoneNumber)) return setError('Enter a valid Sri Lankan mobile number, such as 0712345678 or +94712345678.')
    if (!strongPasswordPattern.test(password)) return setError('Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.')
    if (password !== confirmation) return setError('Your passwords do not match.')
    setBusy(true)
    try {
      await register({ fullName, email, phoneNumber, password, role: owner ? 'owner' : 'student' })
      navigate('/verify-email', { replace: true })
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={owner ? 'Register as a boarding owner' : 'Create your student account'} description={owner ? 'Submit your details to request an owner account. Access is enabled after review.' : 'Create a free account and start building your student profile.'}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field name="fullName" label="Full name" autoComplete="name" required maxLength={100} />
        <Field name="email" label="Email address" type="email" autoComplete="email" required />
        <Field name="phoneNumber" label="Sri Lankan mobile number" type="tel" autoComplete="tel" placeholder="071 234 5678" required />
        <Field label="Password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required hint="At least 8 characters, including upper- and lowercase letters, a number, and a symbol." />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        {owner && <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">Owner registrations are reviewed by an administrator. You can check your approval status after registration.</p>}
        <button className={`${primaryButtonClass} mt-1 w-full`} disabled={busy}>{busy ? 'Creating account…' : owner ? 'Submit registration request' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link to={owner ? '/owner/login' : '/login'} className="font-semibold text-[#183b63] hover:underline">Sign in</Link></p>
      {!owner && <p className="mt-3 text-center text-sm text-slate-500">Are you a boarding owner? <Link to="/owner/register" className="font-semibold text-[#183b63] hover:underline">Register here</Link></p>}
    </AuthCard>
  )
}

export function LoginPage({ admin = false, owner = false }: { admin?: boolean; owner?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { authUser, profile, loading, profileError } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  if (loading && authUser) return <Spinner />
  if (authUser && profileError) {
    return (
      <AuthCard title="We couldn’t verify your account" description="Your sign-in is active, but the account profile could not be loaded.">
        <Alert>{profileError}</Alert>
        {logoutError && <div className="mt-3"><Alert>{logoutError}</Alert></div>}
        <button className={`${secondaryButtonClass} mt-4 w-full`} onClick={async () => { try { await logout(); navigate('/') } catch (issue) { setLogoutError(getFirebaseErrorMessage(issue)) } }}>Sign out</button>
      </AuthCard>
    )
  }
  if (authUser && !profile) return <Spinner label="Loading your account" />
  if (authUser && profile) {
    if (!authUser.emailVerified) return <Navigate to="/verify-email" replace />
    return <Navigate to={profile.role === 'admin' ? '/admin' : profile.role === 'owner' ? (profile.accountStatus === 'suspended' || profile.approvalStatus === 'rejected' ? '/owner/status' : profile.approvalStatus === 'pending' ? '/owner/pending' : '/owner') : profile.accountStatus === 'suspended' ? '/account-suspended' : '/student'} replace />
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    if (!emailPattern.test(email) || !password) return setError('Enter a valid email and password.')
    setError('')
    setBusy(true)
    try {
      if (admin) await loginAsAdmin(email, password)
      else await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from || '/', { replace: true })
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard admin={admin} title={admin ? 'Administrator sign in' : 'Welcome back'} description={admin ? 'Sign in with an administrator account provisioned by your platform administrator.' : 'Sign in to continue to your Boardmate account.'}>
      <form className="grid gap-4" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Field name="email" label="Email address" type="email" autoComplete="email" required />
        <Field name="password" label="Password" type="password" autoComplete="current-password" required />
        {!admin && <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-[#183b63] hover:underline">Forgot password?</Link></div>}
        <button className={`${primaryButtonClass} w-full`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      {!admin && (
        <div className="mt-5 text-center text-sm text-slate-500">
          {owner ? <>Not registered as an owner? <Link to="/owner/register" className="font-semibold text-[#183b63] hover:underline">Create an owner account</Link></> : <>New to Boardmate? <Link to="/register" className="font-semibold text-[#183b63] hover:underline">Create an account</Link></>}
          <p className="mt-3">{owner ? <Link to="/login" className="font-semibold text-[#183b63] hover:underline">Student sign in</Link> : <Link to="/owner/login" className="font-semibold text-[#183b63] hover:underline">Boarding owner sign in</Link>}</p>
        </div>
      )}
      {admin && <p className="mt-5 text-center text-xs text-slate-500">Administrator accounts cannot be created from this page.</p>}
    </AuthCard>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!emailPattern.test(email)) return setError('Enter a valid email address.')
    setBusy(true)
    try {
      await requestPasswordReset(email.trim())
      setMessage('If an account exists for this email, a password reset link is on its way.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Reset your password" description="Enter the email address you used to register and we’ll send you a reset link.">
      <form className="grid gap-4" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}
        <Field label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <button className={`${primaryButtonClass} w-full`} disabled={busy}>{busy ? 'Sending link…' : 'Send reset link'}</button>
      </form>
      <p className="mt-5 text-center text-sm"><Link to="/login" className="font-semibold text-[#183b63] hover:underline">Back to sign in</Link></p>
    </AuthCard>
  )
}

export function VerificationPage() {
  const { authUser, profile, refreshVerification } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!authUser?.emailVerified || !profile) return
    const destination = profile.role === 'admin' ? '/admin' : profile.role === 'owner' ? (profile.accountStatus === 'suspended' || profile.approvalStatus === 'rejected' ? '/owner/status' : profile.approvalStatus === 'pending' ? '/owner/pending' : '/owner') : profile.accountStatus === 'suspended' ? '/account-suspended' : '/student'
    navigate(destination, { replace: true })
  }, [authUser, navigate, profile])

  async function resend() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await resendVerification()
      setMessage('A new verification email has been sent.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  async function checkStatus() {
    setBusy(true)
    setError('')
    try {
      await refreshVerification()
      setMessage('Verification status refreshed.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Verify your email" description="Please confirm your email address to keep your account secure and continue.">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        {message && <Alert type="success">{message}</Alert>}
        {!authUser ? (
          <><Alert type="info">Sign in with the email address you registered to resend or check your verification email.</Alert><Link to="/login" className={`${primaryButtonClass} w-full`}>Go to sign in</Link></>
        ) : (
          <>
            <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">We sent a verification link to <strong className="break-all text-slate-900">{authUser.email}</strong>. Please check your inbox and spam folder.</div>
            <button onClick={checkStatus} className={primaryButtonClass} disabled={busy}>I’ve verified my email</button>
            <button onClick={resend} className={secondaryButtonClass} disabled={busy}>Resend verification email</button>
            <button onClick={async () => { try { await logout(); navigate('/') } catch (issue) { setError(getFirebaseErrorMessage(issue)) } }} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Sign out</button>
          </>
        )}
      </div>
    </AuthCard>
  )
}
