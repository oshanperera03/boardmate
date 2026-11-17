import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  Clock3,
  Mail,
  Plus,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageTitle, Alert, Field, primaryButtonClass, secondaryButtonClass, StatusPill } from '../components/common/UI'
import { useAuth } from '../contexts/AuthContext'
import { logout, requestPasswordReset } from '../services/auth/authService'
import { createProperty, getOwnerProperties, getOwnerPropertyStats } from '../services/properties/propertyService'
import { getOwnerRooms } from '../services/rooms/roomService'
import { updateOwnProfile } from '../services/users/userService'
import type { FacilityOption, GenderPolicy, PreferredContactMethod, PropertyDocument, PropertyType, RoomArrangement } from '../types/property'
import { getFirebaseErrorMessage, sriLankanPhonePattern } from '../utils/validation'

const propertyTypeOptions: Array<{ value: PropertyType; label: string }> = [
  { value: 'boarding_house', label: 'Boarding House' },
  { value: 'annex', label: 'Annex' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'shared_accommodation', label: 'Shared Accommodation' },
  { value: 'apartment', label: 'Apartment' },
]

const genderOptions: Array<{ value: GenderPolicy; label: string }> = [
  { value: 'boys', label: 'Boys Only' },
  { value: 'girls', label: 'Girls Only' },
  { value: 'mixed', label: 'Mixed' },
]

const roomArrangementOptions: Array<{ value: RoomArrangement; label: string }> = [
  { value: 'separate_rooms', label: 'Separate rooms' },
  { value: 'mixed_rooms', label: 'Mixed rooms' },
  { value: 'shared_rooms', label: 'Shared rooms' },
]

const facilityOptions: Array<{ value: FacilityOption; label: string }> = [
  { value: 'wifi', label: 'Wi‑Fi' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'attached_bathroom', label: 'Attached bathroom' },
  { value: 'shared_bathroom', label: 'Shared bathroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'washing_machine', label: 'Washing machine' },
  { value: 'parking', label: 'Parking' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'security', label: 'Security' },
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'furnished_rooms', label: 'Furnished rooms' },
  { value: 'meals_provided', label: 'Meals provided' },
]

const initialForm = {
  propertyName: '',
  description: '',
  propertyType: 'boarding_house' as PropertyType,
  province: '',
  district: '',
  city: '',
  address: '',
  nearbyCampus: '',
  mapLink: '',
  genderPolicy: 'boys' as GenderPolicy,
  roomArrangement: 'separate_rooms' as RoomArrangement,
  separateFloors: false,
  separateRooms: false,
  sharedBedroomsAllowed: false,
  facilities: [] as FacilityOption[],
  images: [] as string[],
  contactName: '',
  contactPhone: '',
  whatsapp: '',
  preferredMethod: 'phone' as PreferredContactMethod,
}

export function StudentDashboard() {
  const { profile } = useAuth()
  return (
    <>
      <PageTitle eyebrow="Student workspace" title={`Welcome, ${profile?.fullName.split(' ')[0] || 'there'}!`} description="Discover approved boarding properties and rooms with available spaces." />
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#183b63]"><Sparkles size={14} /> Verified listings</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Find a place that fits your student life.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Search by campus, budget, room type, gender policy, facilities and availability.</p>
            <Link to="/student/search" className={`${primaryButtonClass} mt-5`}>Find accommodation <ArrowRight size={16} /></Link>
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
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [roomStats, setRoomStats] = useState({ total: 0, available: 0, partiallyAvailable: 0, occupied: 0, temporarilyUnavailable: 0 })

  useEffect(() => {
    if (!profile?.uid) return
    void getOwnerPropertyStats(profile.uid)
      .then(setStats)
      .catch(() => setStats({ total: 0, pending: 0, approved: 0, rejected: 0 }))
    void getOwnerRooms(profile.uid)
      .then((rooms) => setRoomStats({
        total: rooms.length,
        available: rooms.filter((room) => room.availabilityStatus === 'available').length,
        partiallyAvailable: rooms.filter((room) => room.availabilityStatus === 'partially_available').length,
        occupied: rooms.filter((room) => room.availabilityStatus === 'occupied').length,
        temporarilyUnavailable: rooms.filter((room) => room.availabilityStatus === 'temporarily_unavailable').length,
      }))
      .catch(() => setRoomStats({ total: 0, available: 0, partiallyAvailable: 0, occupied: 0, temporarilyUnavailable: 0 }))
  }, [profile?.uid])

  return (
    <>
      <PageTitle eyebrow="Boarding owner workspace" title={`Welcome, ${profile?.fullName.split(' ')[0] || 'there'}`} description="Manage your property listings and keep track of submissions and approvals." action={<StatusPill tone="green">Approved</StatusPill>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total properties</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Approved</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Rejected</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">{stats.rejected}</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-900">Room management</h2><p className="mt-1 text-sm text-slate-500">Track room capacity and availability across your properties.</p></div>
          <Link to="/owner/rooms" className={secondaryButtonClass}>Manage rooms</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total rooms</p><p className="mt-2 text-2xl font-bold text-slate-900">{roomStats.total}</p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Available</p><p className="mt-2 text-2xl font-bold text-emerald-700">{roomStats.available}</p></div>
          <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Partially available</p><p className="mt-2 text-2xl font-bold text-amber-700">{roomStats.partiallyAvailable}</p></div>
          <div className="rounded-xl bg-rose-50 p-4"><p className="text-xs text-rose-700">Occupied</p><p className="mt-2 text-2xl font-bold text-rose-700">{roomStats.occupied}</p></div>
          <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-600">Temporarily unavailable</p><p className="mt-2 text-2xl font-bold text-slate-700">{roomStats.temporarilyUnavailable}</p></div>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 sm:p-9">
        <div className="flex max-w-2xl items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeCheck size={24} /></span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your account is approved</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">You can now register boarding properties, review submissions, and manage your active listings.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={primaryButtonClass} to="/owner/properties/new">Add New Property <Plus size={16} /></Link>
              <Link className={secondaryButtonClass} to="/owner/rooms">Manage rooms</Link>
              <Link className={secondaryButtonClass} to="/owner/properties">My Properties</Link>
            </div>
          </div>
        </div>
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
            <p className="mt-2 text-sm leading-6 text-slate-500">{suspended ? 'Access to owner features is disabled. Please contact the platform administrator for assistance.' : rejected ? 'Your account cannot access owner features. Review the administrator’s note below or contact support if you have questions.' : approved ? 'Your owner account is active. Boarding management tools are available in a future release.' : 'An administrator will review your registration. Owner dashboard access is available only after approval.'}</p>
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

export function OwnerPropertyFormPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  if (!profile || profile.role !== 'owner' || profile.approvalStatus !== 'approved' || profile.accountStatus !== 'active') {
    return <Alert>Only approved owner accounts can submit properties.</Alert>
  }

  function updateField<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: '' }))
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {}

    if (!form.propertyName.trim()) nextErrors.propertyName = 'Property name is required.'
    if (!form.description.trim()) nextErrors.description = 'Property description is required.'
    if (!form.province.trim()) nextErrors.province = 'Province is required.'
    if (!form.district.trim()) nextErrors.district = 'District is required.'
    if (!form.city.trim()) nextErrors.city = 'City or town is required.'
    if (!form.address.trim()) nextErrors.address = 'Full address is required.'
    if (!form.nearbyCampus.trim()) nextErrors.nearbyCampus = 'Nearest university or campus is required.'
    if (!form.mapLink.trim()) nextErrors.mapLink = 'Map link is required.'
    if (!form.genderPolicy) nextErrors.genderPolicy = 'Select a gender policy.'
    if (!form.roomArrangement) nextErrors.roomArrangement = 'Select a room arrangement.'
    if (!form.contactName.trim()) nextErrors.contactName = 'Contact person name is required.'
    if (!form.contactPhone.trim()) nextErrors.contactPhone = 'Phone number is required.'
    else if (!sriLankanPhonePattern.test(form.contactPhone.replace(/[\s()-]/g, ''))) {
      nextErrors.contactPhone = 'Enter a valid Sri Lankan mobile number.'
    }
    if (form.whatsapp.trim() && !sriLankanPhonePattern.test(form.whatsapp.replace(/[\s()-]/g, ''))) {
      nextErrors.whatsapp = 'Enter a valid WhatsApp number.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})

    if (!profile) return

    const cleanPhone = form.contactPhone.replace(/[\s()-]/g, '')
    const cleanWhatsApp = form.whatsapp.replace(/[\s()-]/g, '')

    if (!validateForm()) return

    setSubmitting(true)

    try {
      await createProperty({
        ownerId: profile.uid,
        propertyName: form.propertyName.trim(),
        description: form.description.trim(),
        propertyType: form.propertyType,
        location: {
          province: form.province.trim(),
          district: form.district.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          nearbyCampus: form.nearbyCampus.trim(),
          mapLink: form.mapLink.trim(),
        },
        genderPolicy: form.genderPolicy,
        roomArrangement: form.roomArrangement,
        separateFloors: form.separateFloors,
        separateRooms: form.separateRooms,
        sharedBedroomsAllowed: form.sharedBedroomsAllowed,
        facilities: form.facilities,
        images: [],
        contact: {
          name: form.contactName.trim(),
          phone: cleanPhone,
          whatsapp: cleanWhatsApp,
          preferredMethod: form.preferredMethod,
        },
      })

      navigate('/owner/properties', {
        state: { message: 'Your property has been submitted successfully and is waiting for admin approval.' },
      })
    } catch (issue) {
      setErrors({ submit: getFirebaseErrorMessage(issue) })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="grid gap-5">
            <Field label="Property name" value={form.propertyName} onChange={(event) => updateField('propertyName', event.target.value)} required />
            {errors.propertyName && <p className="text-sm text-rose-600">{errors.propertyName}</p>}
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Property description</label>
              <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" required />
              {errors.description && <p className="text-sm text-rose-600">{errors.description}</p>}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Property type</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {propertyTypeOptions.map((type) => {
                  const selected = form.propertyType === type.value
                  return (
                    <label key={type.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-100'}`}>
                      <input type="radio" name="propertyType" value={type.value} checked={selected} onChange={() => updateField('propertyType', type.value)} className="size-4 accent-[#183b63]" />
                      <span>{type.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Province" value={form.province} onChange={(event) => updateField('province', event.target.value)} required />
              <Field label="District" value={form.district} onChange={(event) => updateField('district', event.target.value)} required />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="City or town" value={form.city} onChange={(event) => updateField('city', event.target.value)} required />
              <Field label="Nearest university or campus" value={form.nearbyCampus} onChange={(event) => updateField('nearbyCampus', event.target.value)} required />
            </div>
            <div>
              <Field label="Full address" value={form.address} onChange={(event) => updateField('address', event.target.value)} required />
              {errors.address && <p className="text-sm text-rose-600">{errors.address}</p>}
            </div>
            <div>
              <Field label="Map link" type="text" placeholder="https://maps.google.com/..." value={form.mapLink} onChange={(event) => updateField('mapLink', event.target.value)} required hint="Paste a Google Maps or other map link for this property." />
              {errors.mapLink && <p className="mt-1.5 text-sm text-rose-600">{errors.mapLink}</p>}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="grid gap-6">
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Gender policy</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {genderOptions.map((option) => (
                  <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${form.genderPolicy === option.value ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-100'}`}>
                    <input type="radio" name="genderPolicy" value={option.value} checked={form.genderPolicy === option.value} onChange={() => updateField('genderPolicy', option.value)} className="size-4 accent-[#183b63]" />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Room arrangement</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {roomArrangementOptions.map((option) => {
                  const selected = form.roomArrangement === option.value
                  return (
                    <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-100'}`}>
                      <input type="radio" name="roomArrangement" value={option.value} checked={selected} onChange={() => updateField('roomArrangement', option.value)} className="size-4 accent-[#183b63]" />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={form.separateFloors} onChange={(event) => updateField('separateFloors', event.target.checked)} /> Separate floors available</label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={form.separateRooms} onChange={(event) => updateField('separateRooms', event.target.checked)} /> Separate rooms available</label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={form.sharedBedroomsAllowed} onChange={(event) => updateField('sharedBedroomsAllowed', event.target.checked)} /> Mixed-gender shared bedrooms allowed</label>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {facilityOptions.map((facility) => {
              const selected = form.facilities.includes(facility.value)
              return (
                <label key={facility.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-100'}`}>
                  <input type="checkbox" checked={selected} onChange={() => {
                    const next = selected
                      ? form.facilities.filter((item) => item !== facility.value)
                      : [...form.facilities, facility.value]
                    updateField('facilities', next)
                  }} className="size-4 rounded accent-[#183b63]" />
                  <span>{facility.label}</span>
                </label>
              )
            })}
          </div>
        )
      case 4:
        return (
          <div className="grid gap-5">
            <Field label="Contact person name" value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} required />
            {errors.contactName && <p className="text-sm text-rose-600">{errors.contactName}</p>}
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Phone number" type="tel" value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} required />
              <Field label="WhatsApp number (optional)" type="tel" value={form.whatsapp} onChange={(event) => updateField('whatsapp', event.target.value)} />
            </div>
            {errors.contactPhone && <p className="text-sm text-rose-600">{errors.contactPhone}</p>}
            {errors.whatsapp && <p className="text-sm text-rose-600">{errors.whatsapp}</p>}
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Preferred contact method</label>
              <select value={form.preferredMethod} onChange={(event) => updateField('preferredMethod', event.target.value as PreferredContactMethod)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="either">Either</option>
              </select>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      <PageTitle eyebrow="Owner workspace" title="Add new property" description="Enter your property details below. The property will be submitted with a pending approval status." />

      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && <Alert>{errors.submit}</Alert>}
          <div className="grid gap-8">
            {[0, 1, 2, 3, 4].map((stepIndex) => (
              <section key={stepIndex} className="border-b border-slate-200 pb-8 last:border-b-0 last:pb-0">
                {renderStepContent(stepIndex)}
              </section>
            ))}
          </div>
          <div className="flex justify-end border-t border-slate-200 pt-6">
            <button type="submit" className={primaryButtonClass} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Property'}</button>
          </div>
        </form>
      </div>
    </>
  )
}

export function OwnerPropertiesPage() {
  const { profile } = useAuth()
  const navigate = useLocation()
  const [properties, setProperties] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const successMessage = (navigate.state as { message?: string } | null)?.message ?? ''

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false)
      return
    }

    void getOwnerProperties(profile.uid)
      .then((items) => setProperties(items))
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  const statusTone = {
    pending: 'amber',
    approved: 'green',
    rejected: 'red',
  } as const

  return (
    <>
      <PageTitle eyebrow="Owner workspace" title="My properties" description="Review your submissions, update details, and monitor approval status." />
      {successMessage && <div className="mb-5"><Alert type="success">{successMessage}</Alert></div>}
      {error && <div className="mb-5"><Alert>{error}</Alert></div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your properties…</div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Building2 className="mx-auto text-slate-400" size={30} />
          <h2 className="mt-4 text-xl font-bold text-slate-900">No properties yet</h2>
          <p className="mt-2 text-sm text-slate-500">Start by adding your first boarding property.</p>
          <Link to="/owner/properties/new" className={`${primaryButtonClass} mt-5`}><Plus size={16} /> Add New Property</Link>
        </div>
      ) : (
        <div className="grid gap-5">
          {properties.map((property) => (
            <article key={property.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="h-full min-h-[180px] bg-slate-100">
                  {property.images[0] ? (
                    <img src={property.images[0]} alt={property.propertyName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">No image</div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{property.propertyName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{propertyTypeOptions.find((item) => item.value === property.propertyType)?.label}</p>
                    </div>
                    <StatusPill tone={statusTone[property.approvalStatus]}>{property.approvalStatus}</StatusPill>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{property.description}</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wider text-slate-500">Location</p><p className="mt-1 text-sm font-medium text-slate-800">{property.location.city}, {property.location.district}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wider text-slate-500">Nearby campus</p><p className="mt-1 text-sm font-medium text-slate-800">{property.location.nearbyCampus}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wider text-slate-500">Gender policy</p><p className="mt-1 text-sm font-medium text-slate-800">{genderOptions.find((item) => item.value === property.genderPolicy)?.label}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wider text-slate-500">Submitted</p><p className="mt-1 text-sm font-medium text-slate-800">{property.createdAt ? new Date(property.createdAt.toDate()).toLocaleDateString() : '—'}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wider text-slate-500">Contact</p><p className="mt-1 text-sm font-medium text-slate-800">{property.contact.name}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wider text-slate-500">Preferred method</p><p className="mt-1 text-sm font-medium text-slate-800">{property.contact.preferredMethod}</p></div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
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
