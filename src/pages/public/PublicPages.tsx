import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, Building2, GraduationCap, House, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { login, loginAsAdmin, loginAsAdminWithGoogle, loginWithGoogle, logout, register, registerWithGoogle, requestPasswordReset } from '../../services/auth/authService'
import { getFirebaseErrorMessage, emailPattern, sriLankanPhonePattern, strongPasswordPattern } from '../../utils/validation'
import { Alert, Brand, Field, primaryButtonClass, secondaryButtonClass, Spinner } from '../../components/common/UI'
import { GoogleIcon } from '../../components/auth/GoogleIcon'
import { AuthCard } from '../../components/auth/AuthCard'



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
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  async function continueWithGoogle() {
    setError('')
    setGoogleBusy(true)
    try {
      await registerWithGoogle(owner ? 'owner' : 'student')
      navigate('/', { replace: true })
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setGoogleBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    const data = new FormData(event.currentTarget)
    const fullName = String(data.get('fullName') || '').trim()
    const email = String(data.get('email') || '').trim()
    const phoneNumber = String(data.get('phoneNumber') || '').replace(/[\s()-]/g, '')
    const requiredErrors: Record<string, string> = {}
    if (!fullName) requiredErrors.fullName = 'Enter your full name.'
    if (!email) requiredErrors.email = 'Enter your email address.'
    if (!phoneNumber) requiredErrors.phoneNumber = 'Enter your mobile number.'
    if (!password) requiredErrors.password = 'Enter a password.'
    if (!confirmation) requiredErrors.confirmation = 'Confirm your password.'
    if (Object.keys(requiredErrors).length) return setFieldErrors(requiredErrors)
    if (!emailPattern.test(email)) return setFieldErrors({ email: 'Enter a valid email address.' })
    if (!sriLankanPhonePattern.test(phoneNumber)) return setFieldErrors({ phoneNumber: 'Enter a valid Sri Lankan mobile number, such as 0712345678 or +94712345678.' })
    if (!strongPasswordPattern.test(password)) return setFieldErrors({ password: 'Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.' })
    if (password !== confirmation) return setFieldErrors({ confirmation: 'Your passwords do not match.' })
    setBusy(true)
    try {
      await register({ fullName, email, phoneNumber, password, role: owner ? 'owner' : 'student' })
      navigate('/', { replace: true })
    } catch (issue) {
      const code = typeof issue === 'object' && issue && 'code' in issue ? String(issue.code) : ''
      const field = code === 'auth/email-already-in-use' || code === 'auth/invalid-email'
        ? 'email'
        : code === 'auth/weak-password'
          ? 'password'
          : ''
      if (field) setFieldErrors({ [field]: getFirebaseErrorMessage(issue) })
      else setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={owner ? 'Register as a boarding owner' : 'Create your student account'} description={owner ? 'Submit your details to request an owner account. Access is enabled after review.' : 'Create a free account and start building your student profile.'}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field name="fullName" label="Full name" autoComplete="name" required maxLength={100} error={fieldErrors.fullName} onChange={() => setFieldErrors((current) => ({ ...current, fullName: '' }))} />
        <Field name="email" label="Email address" type="email" autoComplete="email" required error={fieldErrors.email} onChange={() => setFieldErrors((current) => ({ ...current, email: '' }))} />
        <Field name="phoneNumber" label="Sri Lankan mobile number" type="tel" autoComplete="tel" placeholder="071 234 5678" required error={fieldErrors.phoneNumber} onChange={() => setFieldErrors((current) => ({ ...current, phoneNumber: '' }))} />
        <Field name="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: '' })) }} required hint="At least 8 characters, including upper- and lowercase letters, a number, and a symbol." error={fieldErrors.password} />
        <Field name="confirmation" label="Confirm password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setFieldErrors((current) => ({ ...current, confirmation: '' })) }} required error={fieldErrors.confirmation} />
        {owner && <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">Owner registrations are reviewed by an administrator. You can check your approval status after registration.</p>}
        <button className={`${primaryButtonClass} mt-1 w-full`} disabled={busy || googleBusy}>{busy ? 'Creating account…' : owner ? 'Submit registration request' : 'Create account'}</button>
      </form>
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={continueWithGoogle}
        disabled={busy || googleBusy}
      >
        <GoogleIcon />
        {googleBusy ? 'Connecting…' : 'Continue with Google'}
      </button>
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
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
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
    return <Navigate to={profile.role === 'admin' ? '/admin' : profile.role === 'owner' ? (profile.accountStatus === 'suspended' || profile.approvalStatus === 'rejected' ? '/owner/status' : profile.approvalStatus === 'pending' ? '/owner/pending' : '/owner') : profile.accountStatus === 'suspended' ? '/account-suspended' : '/student'} replace />
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    setError('')
    setEmailError('')
    setPasswordError('')
    if (!emailPattern.test(email)) return setEmailError('Enter a valid email address.')
    if (!password) return setPasswordError('Enter your password.')
    setBusy(true)
    try {
      if (admin) await loginAsAdmin(email, password)
      else await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(admin ? '/admin' : from || '/', { replace: true })
    } catch (issue) {
      const code = typeof issue === 'object' && issue && 'code' in issue ? String(issue.code) : ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setPasswordError(getFirebaseErrorMessage(issue))
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setEmailError(getFirebaseErrorMessage(issue))
      } else {
        setError(getFirebaseErrorMessage(issue))
      }
    } finally {
      setBusy(false)
    }
  }

  async function continueWithGoogle() {
    setError('')
    setGoogleBusy(true)
    try {
      if (admin) await loginAsAdminWithGoogle()
      else await loginWithGoogle(owner ? 'owner' : 'student')
      const from = (location.state as { from?: string } | null)?.from
      navigate(admin ? '/admin' : from || '/', { replace: true })
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <AuthCard admin={admin} title={admin ? 'Administrator sign in' : 'Welcome back'} description={admin ? 'Sign in with an administrator account provisioned by your platform administrator.' : 'Sign in to continue to your Boardmate account.'}>
      <form className="grid gap-4" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Field name="email" label="Email address" type="email" autoComplete="email" required error={emailError} onChange={() => setEmailError('')} />
        <Field name="password" label="Password" type="password" autoComplete="current-password" required error={passwordError} onChange={() => setPasswordError('')} />
        {!admin && <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-[#183b63] hover:underline">Forgot password?</Link></div>}
        <button className={`${primaryButtonClass} w-full`} disabled={busy || googleBusy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <>
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={continueWithGoogle}
          disabled={busy || googleBusy}
        >
          <GoogleIcon />
          {googleBusy ? 'Connecting…' : 'Continue with Google'}
        </button>
      </>
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

