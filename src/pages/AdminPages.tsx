import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, Clock3, Eye, ShieldAlert, Users, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Field, PageTitle, primaryButtonClass, secondaryButtonClass, Spinner, StatusPill } from '../components/common/UI'
import { getAllUsers, getOwner, getOwners, getPendingOwners, reviewOwner, suspendOwner } from '../services/users/userService'
import type { UserProfile } from '../types/user'
import { getFirebaseErrorMessage } from '../utils/validation'

function getDate(value: UserProfile['createdAt']): string {
  if (!value || typeof value.toDate !== 'function') return '—'
  return value.toDate().toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ActivityList({ users }: { users: UserProfile[] }) {
  if (!users.length) return <p className="py-8 text-center text-sm text-slate-500">No registrations yet.</p>
  return (
    <ul className="divide-y divide-slate-100">
      {users.slice(0, 6).map((user) => (
        <li key={user.uid} className="flex items-center justify-between gap-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-[#183b63]">{user.fullName.charAt(0).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{user.fullName}</p><p className="truncate text-xs capitalize text-slate-500">{user.role} · {user.email}</p></div>
          </div>
          <span className="shrink-0 text-xs text-slate-400">{getDate(user.createdAt)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAllUsers().then(setUsers).catch((issue: unknown) => setError(getFirebaseErrorMessage(issue))).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading administrator overview" />
  const students = users.filter((user) => user.role === 'student').length
  const owners = users.filter((user) => user.role === 'owner')
  const pending = owners.filter((user) => user.approvalStatus === 'pending').length
  const approved = owners.filter((user) => user.approvalStatus === 'approved').length
  const rejected = owners.filter((user) => user.approvalStatus === 'rejected').length
  const stats = [
    { label: 'Registered students', value: students, icon: Users, tone: 'bg-blue-50 text-blue-700', detail: 'Student accounts' },
    { label: 'Registered owners', value: owners.length, icon: Users, tone: 'bg-violet-50 text-violet-700', detail: 'All owner accounts' },
    { label: 'Pending approvals', value: pending, icon: Clock3, tone: 'bg-amber-50 text-amber-700', detail: 'Awaiting your review' },
    { label: 'Approved owners', value: approved, icon: ArrowUpRight, tone: 'bg-emerald-50 text-emerald-700', detail: 'Approved accounts' },
    { label: 'Rejected owners', value: rejected, icon: ArrowDownRight, tone: 'bg-rose-50 text-rose-700', detail: 'Not approved' },
  ]

  return (
    <>
      <PageTitle eyebrow="Administrator workspace" title="Platform overview" description="Monitor registrations and review boarding owner account requests." action={<Link to="/admin/requests" className={primaryButtonClass}>Review requests <Clock3 size={16} /></Link>} />
      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone, detail }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-lg bg-slate-50"><Icon size={19} className="text-[#183b63]" /></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{detail}</span></div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
          </div>
        ))}
      </div>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white px-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-5"><div><h2 className="font-bold text-slate-900">Recent registration activity</h2><p className="mt-1 text-xs text-slate-500">Latest registered students and boarding owners</p></div><Link to="/admin/users" className="text-sm font-semibold text-[#183b63]">View all users →</Link></div>
        <ActivityList users={users} />
      </section>
    </>
  )
}

function OwnerTable({ users, empty, onReview }: { users: UserProfile[]; empty: string; onReview?: (uid: string, decision: 'approve' | 'reject', reason?: string) => Promise<void> }) {
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [busyUid, setBusyUid] = useState('')
  const [error, setError] = useState('')

  async function act(uid: string, decision: 'approve' | 'reject') {
    setError('')
    if (decision === 'reject' && !reasons[uid]?.trim()) {
      setError('Add a rejection reason before rejecting an owner.')
      return
    }
    if (!onReview) return
    setBusyUid(uid)
    try {
      await onReview(uid, decision, reasons[uid])
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusyUid('')
    }
  }

  if (!users.length) return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">{empty}</div>
  return (
    <>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Owner</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Registered</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.uid} className="align-top">
                <td className="px-5 py-4"><p className="font-semibold text-slate-800">{user.fullName}</p><p className="mt-1 text-xs text-slate-500">{user.uid}</p></td>
                <td className="px-5 py-4 text-slate-600"><p>{user.email}</p><p className="mt-1 text-xs">{user.phoneNumber}</p></td>
                <td className="px-5 py-4 text-slate-600">{getDate(user.createdAt)}</td>
                <td className="px-5 py-4"><StatusPill tone={user.accountStatus === 'suspended' ? 'red' : user.approvalStatus === 'approved' ? 'green' : user.approvalStatus === 'rejected' ? 'red' : 'amber'}>{user.accountStatus === 'suspended' ? 'Suspended' : user.approvalStatus}</StatusPill></td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/owners/${user.uid}`} className={`${secondaryButtonClass} min-h-9 px-3 py-1.5`}><Eye size={15} /> Details</Link>
                    {onReview && user.approvalStatus === 'pending' && <>
                      <input aria-label={`Rejection reason for ${user.fullName}`} className="h-9 w-40 rounded-md border border-slate-200 px-2 text-xs" placeholder="Reason if rejecting" value={reasons[user.uid] || ''} onChange={(event) => setReasons({ ...reasons, [user.uid]: event.target.value })} />
                      <button onClick={() => act(user.uid, 'approve')} disabled={busyUid === user.uid} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check size={14} /> Approve</button>
                      <button onClick={() => act(user.uid, 'reject')} disabled={busyUid === user.uid} className="inline-flex h-9 items-center gap-1 rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><X size={14} /> Reject</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function OwnerRequestsPage() {
  const [owners, setOwners] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      setOwners(await getPendingOwners())
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  async function decide(uid: string, decision: 'approve' | 'reject', reason?: string) {
    await reviewOwner(uid, decision, reason)
    setOwners((current) => current.filter((owner) => owner.uid !== uid))
  }

  return (
    <>
      <PageTitle eyebrow="Administrator workspace" title="Owner approval requests" description="Review owner registration details before enabling dashboard access." action={<StatusPill tone="amber">{owners.length} pending</StatusPill>} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? <Spinner label="Loading owner requests" /> : <OwnerTable users={owners} empty="There are no owner requests waiting for review." onReview={decide} />}
    </>
  )
}

export function OwnersListPage({ status }: { status: 'approved' | 'rejected' }) {
  const [owners, setOwners] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    getOwners(status).then(setOwners).catch((issue: unknown) => setError(getFirebaseErrorMessage(issue))).finally(() => setLoading(false))
  }, [status])

  return (
    <>
      <PageTitle eyebrow="Administrator workspace" title={`${status === 'approved' ? 'Approved' : 'Rejected'} owners`} description={`Review boarding owner accounts with ${status} registration requests.`} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? <Spinner label="Loading owner accounts" /> : <OwnerTable users={owners} empty={`No ${status} owner accounts found.`} />}
    </>
  )
}

export function RegisteredUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    getAllUsers().then(setUsers).catch((issue: unknown) => setError(getFirebaseErrorMessage(issue))).finally(() => setLoading(false))
  }, [])
  return (
    <>
      <PageTitle eyebrow="Administrator workspace" title="Registered users" description="Students and boarding owners currently registered on the platform." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? <Spinner label="Loading registered users" /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Registered</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => <tr key={user.uid}>
                <td className="px-5 py-4"><p className="font-semibold text-slate-800">{user.fullName}</p><p className="mt-1 text-xs text-slate-500">{user.uid}</p></td>
                <td className="px-5 py-4 text-slate-600"><p>{user.email}</p><p className="mt-1 text-xs">{user.phoneNumber}</p></td>
                <td className="px-5 py-4 capitalize text-slate-600">{user.role}</td>
                <td className="px-5 py-4"><StatusPill tone={user.accountStatus === 'suspended' ? 'red' : user.role === 'owner' && user.approvalStatus === 'approved' ? 'green' : user.role === 'owner' && user.approvalStatus === 'rejected' ? 'red' : user.role === 'owner' ? 'amber' : 'blue'}>{user.accountStatus === 'suspended' ? 'Suspended' : user.approvalStatus}</StatusPill></td>
                <td className="px-5 py-4 text-slate-600">{getDate(user.createdAt)}</td>
              </tr>)}
            </tbody>
          </table>
          {!users.length && <p className="py-10 text-center text-sm text-slate-500">No registered users.</p>}
        </div>
      )}
    </>
  )
}

export function OwnerDetailsPage() {
  const { uid } = useParams()
  const [owner, setOwner] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    if (!uid) return
    try {
      setOwner(await getOwner(uid))
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [uid])

  async function decide(decision: 'approve' | 'reject') {
    if (!uid) return
    setBusy(true)
    setError('')
    setMessage('')
    if (decision === 'reject' && !reason.trim()) {
      setBusy(false)
      setError('A rejection reason is required.')
      return
    }
    try {
      await reviewOwner(uid, decision, reason)
      await load()
      setMessage(`Owner request ${decision === 'approve' ? 'approved' : 'rejected'}.`)
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  async function handleSuspend() {
    if (!uid) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await suspendOwner(uid)
      await load()
      setMessage('Owner account suspended.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading owner details" />
  if (!owner) return <><PageTitle eyebrow="Administrator workspace" title="Owner not found" /><Alert>{error || 'No owner account exists with that ID.'}</Alert><Link className="mt-4 inline-block text-sm font-semibold text-[#183b63]" to="/admin/users">Back to registered users</Link></>

  return (
    <>
      <PageTitle eyebrow="Administrator workspace" title="Owner account details" description="Review the submitted profile information and manage account access." action={<StatusPill tone={owner.accountStatus === 'suspended' ? 'red' : owner.approvalStatus === 'approved' ? 'green' : owner.approvalStatus === 'rejected' ? 'red' : 'amber'}>{owner.accountStatus === 'suspended' ? 'Suspended' : owner.approvalStatus}</StatusPill>} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}
      <div className="grid max-w-4xl gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="font-bold text-slate-900">Submitted information</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold text-slate-500">Full name</dt><dd className="mt-1 text-sm font-medium text-slate-800">{owner.fullName}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Email</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800">{owner.email}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Phone number</dt><dd className="mt-1 text-sm font-medium text-slate-800">{owner.phoneNumber || '—'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Registered</dt><dd className="mt-1 text-sm font-medium text-slate-800">{getDate(owner.createdAt)}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">Account ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-600">{owner.uid}</dd></div>
            {owner.rejectionReason && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">Rejection reason</dt><dd className="mt-1 text-sm leading-6 text-slate-700">{owner.rejectionReason}</dd></div>}
          </dl>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="font-bold text-slate-900">Account actions</h2>
          {owner.approvalStatus === 'pending' ? (
            <>
              <form className="mt-4 grid gap-4">
                <Field label="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required if rejecting" maxLength={1000} hint="This reason is shown to the owner if their request is rejected." />
                <button type="button" onClick={() => void decide('approve')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={busy}><Check size={16} /> Approve owner</button>
                <button type="button" onClick={() => void decide('reject')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" disabled={busy}><X size={16} /> Reject request</button>
              </form>
              <button type="button" onClick={() => void handleSuspend()} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={busy}><ShieldAlert size={16} /> Suspend owner account</button>
            </>
          ) : owner.accountStatus !== 'suspended' ? (
            <div className="mt-4">
              <p className="text-sm leading-6 text-slate-500">Suspending this account revokes active sessions and prevents protected dashboard access.</p>
              <button onClick={() => void handleSuspend()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={busy}><ShieldAlert size={16} /> Suspend owner account</button>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">This owner account has been suspended.</p>}
        </section>
      </div>
    </>
  )
}
