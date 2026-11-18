import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, Eye, Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Field, PageTitle, primaryButtonClass, secondaryButtonClass, Spinner, StatusPill } from '../../components/common/UI'
import { useAuth } from '../../contexts/AuthContext'
import { getOwnerProperties } from '../../services/properties/propertyService'
import {
  calculateAvailableSpaces,
  calculateAvailabilityStatus,
  createRoom,
  deleteRoom,
  getOwnerRoom,
  getOwnerRooms,
  updateRoom,
  updateRoomAvailability,
} from '../../services/rooms/roomService'
import type { PropertyDocument } from '../../types/property'
import type { RoomAvailabilityStatus, RoomDocument, RoomFacility, RoomGenderPolicy, RoomInput, RoomType, SharingArrangement } from '../../types/room'
import { getFirebaseErrorMessage } from '../../utils/validation'

const roomTypeOptions: Array<{ value: RoomType; label: string }> = [
  { value: 'single', label: 'Single room' },
  { value: 'double', label: 'Double room' },
  { value: 'triple', label: 'Triple room' },
  { value: 'shared', label: 'Shared room' },
  { value: 'other', label: 'Other' },
]

const genderOptions: Array<{ value: RoomGenderPolicy; label: string }> = [
  { value: 'boys', label: 'Boys only' },
  { value: 'girls', label: 'Girls only' },
  { value: 'mixed', label: 'Mixed' },
]

const sharingOptions: Array<{ value: SharingArrangement; label: string }> = [
  { value: 'private', label: 'Private room' },
  { value: 'shared', label: 'Shared room' },
  { value: 'separate_beds', label: 'Separate beds' },
  { value: 'other', label: 'Other' },
]

const facilityOptions: Array<{ value: RoomFacility; label: string }> = [
  { value: 'bed', label: 'Bed' },
  { value: 'mattress', label: 'Mattress' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'study_table', label: 'Study table' },
  { value: 'chair', label: 'Chair' },
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'fan', label: 'Fan' },
  { value: 'attached_bathroom', label: 'Attached bathroom' },
  { value: 'shared_bathroom', label: 'Shared bathroom' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'other', label: 'Other' },
]

const availabilityOptions: Array<{ value: RoomAvailabilityStatus; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'partially_available', label: 'Partially available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'temporarily_unavailable', label: 'Temporarily unavailable' },
]

const initialForm: RoomInput = {
  propertyId: '',
  roomName: '',
  roomType: 'single',
  monthlyPrice: 0,
  advancePayment: 0,
  additionalCharges: 0,
  utilitiesIncluded: false,
  maximumOccupants: 1,
  currentOccupants: 0,
  genderPolicy: 'mixed',
  sharingArrangement: 'private',
  facilities: [],
}

const statusTone: Record<RoomAvailabilityStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  available: 'green',
  partially_available: 'amber',
  occupied: 'red',
  temporarily_unavailable: 'slate',
}

function statusLabel(status: RoomAvailabilityStatus): string {
  return availabilityOptions.find((option) => option.value === status)?.label || status
}

function roomTypeLabel(type: RoomType): string {
  return roomTypeOptions.find((option) => option.value === type)?.label || type
}

function formatPrice(value: number): string {
  return `LKR ${value.toLocaleString('en-LK')}`
}

function ownerOnly(profile: ReturnType<typeof useAuth>['profile']): boolean {
  return Boolean(profile?.role === 'owner' && profile.approvalStatus === 'approved' && profile.accountStatus === 'active')
}

function RoomStats({ rooms }: { rooms: RoomDocument[] }) {
  const stats = [
    { label: 'Total rooms', value: rooms.length, tone: 'text-slate-900' },
    { label: 'Available', value: rooms.filter((room) => room.availabilityStatus === 'available').length, tone: 'text-emerald-600' },
    { label: 'Partially available', value: rooms.filter((room) => room.availabilityStatus === 'partially_available').length, tone: 'text-amber-600' },
    { label: 'Occupied', value: rooms.filter((room) => room.availabilityStatus === 'occupied').length, tone: 'text-rose-600' },
    { label: 'Temporarily unavailable', value: rooms.filter((room) => room.availabilityStatus === 'temporarily_unavailable').length, tone: 'text-slate-600' },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className={`mt-3 text-3xl font-bold ${stat.tone}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

export function OwnerRoomsPage() {
  const { profile } = useAuth()
  const location = useLocation()
  const [rooms, setRooms] = useState<RoomDocument[]>([])
  const [properties, setProperties] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const successMessage = (location.state as { message?: string } | null)?.message || ''

  useEffect(() => {
    if (!profile?.uid) return
    void Promise.all([getOwnerRooms(profile.uid), getOwnerProperties(profile.uid)])
      .then(([roomItems, propertyItems]) => {
        setRooms(roomItems)
        setProperties(propertyItems)
      })
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  const propertyNames = useMemo(() => new Map(properties.map((property) => [property.id, property.propertyName])), [properties])
  const filteredRooms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return rooms.filter((room) => {
      const propertyName = propertyNames.get(room.propertyId) || ''
      return (!normalizedSearch || `${room.roomName} ${propertyName}`.toLowerCase().includes(normalizedSearch))
        && (!propertyFilter || room.propertyId === propertyFilter)
        && (!typeFilter || room.roomType === typeFilter)
        && (!genderFilter || room.genderPolicy === genderFilter)
        && (!statusFilter || room.availabilityStatus === statusFilter)
    })
  }, [genderFilter, propertyFilter, propertyNames, rooms, search, statusFilter, typeFilter])

  async function changeStatus(room: RoomDocument, status: RoomAvailabilityStatus) {
    setError('')
    try {
      await updateRoomAvailability(room.id || '', status)
      setRooms((current) => current.map((item) => item.id === room.id ? { ...item, availabilityStatus: status } : item))
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  async function removeRoom(room: RoomDocument) {
    if (!room.id || !window.confirm(`Delete ${room.roomName}? This cannot be undone.`)) return
    setError('')
    try {
      await deleteRoom(room.id)
      setRooms((current) => current.filter((item) => item.id !== room.id))
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  if (!ownerOnly(profile)) return <Alert>Only approved and active owners can manage rooms.</Alert>
  if (loading) return <Spinner label="Loading your rooms" />

  return (
    <>
      <PageTitle eyebrow="Owner workspace" title="Room management" description="Register rooms and keep availability information accurate for students." action={<Link to="/owner/rooms/new" className={primaryButtonClass}><Plus size={16} /> Add room</Link>} />
      {successMessage && <div className="mb-5"><Alert type="success">{successMessage}</Alert></div>}
      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      <RoomStats rooms={rooms} />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rooms or properties" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
          <Filter size={17} className="text-slate-400" />
          <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All properties</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.propertyName}</option>)}</select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All room types</option>{roomTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All policies</option>{genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All statuses</option>{availabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>
      </section>
      {filteredRooms.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Building2 className="mx-auto text-slate-400" size={30} />
          <h2 className="mt-4 text-xl font-bold text-slate-900">{rooms.length ? 'No rooms match your filters' : 'No rooms registered yet'}</h2>
          <p className="mt-2 text-sm text-slate-500">{rooms.length ? 'Try changing the search or filters.' : 'Add your first room to start managing availability.'}</p>
          {!rooms.length && <Link to="/owner/rooms/new" className={`${primaryButtonClass} mt-5`}><Plus size={16} /> Add room</Link>}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filteredRooms.map((room) => (
            <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-bold text-slate-900">{room.roomName}</h2><p className="mt-1 text-sm text-slate-500">{propertyNames.get(room.propertyId) || 'Unknown property'} · {roomTypeLabel(room.roomType)}</p></div>
                <StatusPill tone={statusTone[room.availabilityStatus]}>{statusLabel(room.availabilityStatus)}</StatusPill>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-slate-500">Monthly rent</p><p className="mt-1 font-semibold">{formatPrice(room.monthlyPrice)}</p></div>
                <div><p className="text-xs text-slate-500">Capacity</p><p className="mt-1 font-semibold">{room.maximumOccupants}</p></div>
                <div><p className="text-xs text-slate-500">Available spaces</p><p className="mt-1 font-semibold">{room.availableSpaces}</p></div>
                <div><p className="text-xs text-slate-500">Occupants</p><p className="mt-1 font-semibold">{room.currentOccupants}</p></div>
                <div><p className="text-xs text-slate-500">Gender</p><p className="mt-1 font-semibold capitalize">{room.genderPolicy}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <select aria-label={`Availability for ${room.roomName}`} value={room.availabilityStatus} onChange={(event) => void changeStatus(room, event.target.value as RoomAvailabilityStatus)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs"><option value="" disabled>Update availability</option>{availabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <Link to={`/owner/rooms/${room.id}`} className={`${secondaryButtonClass} min-h-9 px-3 py-1.5 text-xs`}><Eye size={14} /> View</Link>
                <Link to={`/owner/rooms/${room.id}/edit`} className={`${secondaryButtonClass} min-h-9 px-3 py-1.5 text-xs`}><Pencil size={14} /> Edit</Link>
                <button type="button" onClick={() => void removeRoom(room)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

function ChoiceGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${value === option.value ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>
            <input type="radio" name={label} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="size-4 accent-[#183b63]" />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  )
}

export function RoomFormPage() {
  const { profile } = useAuth()
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [properties, setProperties] = useState<PropertyDocument[]>([])
  const [form, setForm] = useState<RoomInput>(initialForm)
  const [temporarilyUnavailable, setTemporarilyUnavailable] = useState(false)
  const [loading, setLoading] = useState(Boolean(roomId))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile?.uid) return
    void Promise.all([getOwnerProperties(profile.uid), roomId ? getOwnerRoom(roomId, profile.uid) : Promise.resolve(null)])
      .then(([propertyItems, room]) => {
        setProperties(propertyItems)
        if (room) {
          setForm({
            propertyId: room.propertyId,
            roomName: room.roomName,
            roomType: room.roomType,
            monthlyPrice: room.monthlyPrice,
            advancePayment: room.advancePayment,
            additionalCharges: room.additionalCharges,
            utilitiesIncluded: room.utilitiesIncluded,
            maximumOccupants: room.maximumOccupants,
            currentOccupants: room.currentOccupants,
            genderPolicy: room.genderPolicy,
            sharingArrangement: room.sharingArrangement,
            facilities: room.facilities,
          })
          setTemporarilyUnavailable(room.availabilityStatus === 'temporarily_unavailable')
        } else if (roomId) {
          setError('Room not found or you do not have permission to edit it.')
        }
      })
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid, roomId])

  function updateField<K extends keyof RoomInput>(key: K, value: RoomInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const action = roomId ? updateRoom(roomId, form, temporarilyUnavailable) : createRoom(form)
    void action.then(() => navigate('/owner/rooms', { state: { message: roomId ? 'Room updated successfully.' : 'Room registered successfully.' } })).catch((issue: unknown) => setError(getFirebaseErrorMessage(issue))).finally(() => setSubmitting(false))
  }

  if (!ownerOnly(profile)) return <Alert>Only approved and active owners can manage rooms.</Alert>
  if (loading) return <Spinner label="Loading room form" />

  const availableSpaces = calculateAvailableSpaces(form.maximumOccupants, form.currentOccupants)
  const calculatedStatus = calculateAvailabilityStatus(form.maximumOccupants, form.currentOccupants, temporarilyUnavailable)
  return (
    <>
      <PageTitle eyebrow="Owner workspace" title={roomId ? 'Edit room' : 'Register a room'} description="Keep pricing, capacity and room availability information accurate." />
      <form onSubmit={submit} className="mx-auto grid max-w-4xl gap-6">
        {error && <Alert>{error}</Alert>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Basic information</h2>
          <div className="mt-5 grid gap-5">
            <div className="grid gap-1.5"><label className="text-sm font-semibold text-slate-700">Boarding property</label><select required value={form.propertyId} onChange={(event) => updateField('propertyId', event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select a property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.propertyName}</option>)}</select></div>
            <Field label="Room name or number" value={form.roomName} onChange={(event) => updateField('roomName', event.target.value)} required maxLength={100} />
            <ChoiceGroup label="Room type" value={form.roomType} options={roomTypeOptions} onChange={(value) => updateField('roomType', value)} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Pricing</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Field label="Monthly rent (LKR)" type="number" min="0" step="1" value={form.monthlyPrice} onChange={(event) => updateField('monthlyPrice', Number(event.target.value))} required />
            <Field label="Advance payment (LKR)" type="number" min="0" step="1" value={form.advancePayment} onChange={(event) => updateField('advancePayment', Number(event.target.value))} required />
            <Field label="Additional charges (LKR)" type="number" min="0" step="1" value={form.additionalCharges} onChange={(event) => updateField('additionalCharges', Number(event.target.value))} required />
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.utilitiesIncluded} onChange={(event) => updateField('utilitiesIncluded', event.target.checked)} className="size-4 accent-[#183b63]" /> Utility bills are included in the monthly rent</label>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Capacity and occupancy</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Field label="Maximum occupants" type="number" min="1" step="1" value={form.maximumOccupants} onChange={(event) => updateField('maximumOccupants', Number(event.target.value))} required />
            <Field label="Current occupants" type="number" min="0" max={form.maximumOccupants} step="1" value={form.currentOccupants} onChange={(event) => updateField('currentOccupants', Number(event.target.value))} required />
            <div className="grid gap-1.5"><label className="text-sm font-semibold text-slate-700">Available spaces</label><div className={`flex h-11 items-center rounded-lg border px-3.5 text-sm font-semibold ${availableSpaces < 0 ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>{availableSpaces}</div></div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Availability is calculated automatically: {calculatedStatus === 'temporarily_unavailable' ? 'temporarily unavailable' : statusLabel(calculatedStatus)}.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Gender and sharing policy</h2>
          <div className="mt-5 grid gap-6"><ChoiceGroup label="Gender policy" value={form.genderPolicy} options={genderOptions} onChange={(value) => updateField('genderPolicy', value)} /><ChoiceGroup label="Sharing arrangement" value={form.sharingArrangement} options={sharingOptions} onChange={(value) => updateField('sharingArrangement', value)} /></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Room facilities</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {facilityOptions.map((facility) => <label key={facility.value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={form.facilities.includes(facility.value)} onChange={() => updateField('facilities', form.facilities.includes(facility.value) ? form.facilities.filter((item) => item !== facility.value) : [...form.facilities, facility.value])} className="size-4 rounded accent-[#183b63]" /> {facility.label}</label>)}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Availability</h2>
          <label className="mt-5 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={temporarilyUnavailable} onChange={(event) => setTemporarilyUnavailable(event.target.checked)} className="size-4 accent-[#183b63]" /> Mark this room temporarily unavailable</label>
        </section>
        <div className="flex justify-end gap-3"><Link to="/owner/rooms" className={secondaryButtonClass}>Cancel</Link><button className={primaryButtonClass} disabled={submitting}>{submitting ? 'Saving…' : roomId ? 'Save changes' : 'Register room'}</button></div>
      </form>
    </>
  )
}

export function RoomDetailsPage() {
  const { profile } = useAuth()
  const { roomId } = useParams()
  const [room, setRoom] = useState<RoomDocument | null>(null)
  const [properties, setProperties] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!profile?.uid || !roomId) return
    void Promise.all([getOwnerRoom(roomId, profile.uid), getOwnerProperties(profile.uid)])
      .then(([roomItem, propertyItems]) => { setRoom(roomItem); setProperties(propertyItems) })
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid, roomId])
  if (!ownerOnly(profile)) return <Alert>Only approved and active owners can manage rooms.</Alert>
  if (loading) return <Spinner label="Loading room details" />
  if (!room) return <Alert>{error || 'Room not found.'}</Alert>
  const property = properties.find((item) => item.id === room.propertyId)
  return (
    <>
      <PageTitle eyebrow="Owner workspace" title={room.roomName} description="View room details and current availability." action={<Link to={`/owner/rooms/${room.id}/edit`} className={primaryButtonClass}><Pencil size={16} /> Edit room</Link>} />
      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{property?.propertyName || 'Property'}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{roomTypeLabel(room.roomType)}</h2></div><StatusPill tone={statusTone[room.availabilityStatus]}>{statusLabel(room.availabilityStatus)}</StatusPill></div><dl className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Monthly rent</dt><dd className="mt-1 font-semibold">{formatPrice(room.monthlyPrice)}</dd></div><div><dt className="text-slate-500">Advance</dt><dd className="mt-1 font-semibold">{formatPrice(room.advancePayment)}</dd></div><div><dt className="text-slate-500">Maximum occupants</dt><dd className="mt-1 font-semibold">{room.maximumOccupants}</dd></div><div><dt className="text-slate-500">Current occupants</dt><dd className="mt-1 font-semibold">{room.currentOccupants}</dd></div><div><dt className="text-slate-500">Available spaces</dt><dd className="mt-1 font-semibold">{room.availableSpaces}</dd></div><div><dt className="text-slate-500">Gender policy</dt><dd className="mt-1 font-semibold capitalize">{room.genderPolicy}</dd></div></dl></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-900">Facilities and charges</h2><p className="mt-3 text-sm text-slate-600">{room.facilities.length ? room.facilities.map((facility) => facility.replaceAll('_', ' ')).join(', ') : 'No facilities listed.'}</p><dl className="mt-6 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Additional charges</dt><dd className="font-semibold">{formatPrice(room.additionalCharges)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Utilities included</dt><dd className="font-semibold">{room.utilitiesIncluded ? 'Yes' : 'No'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Sharing arrangement</dt><dd className="font-semibold capitalize">{room.sharingArrangement.replace('_', ' ')}</dd></div></dl></section>
      </div>
    </>
  )
}
