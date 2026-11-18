import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Mail, Phone, Star, User, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  acceptBooking,
  cancelAcceptedBookingByOwner,
  cancelBooking,
  confirmPaymentAndOccupancy,
  getOwnerBookings,
  getStudentBookings,
  rejectBooking,
  submitBookingRequest,
} from '../../services/bookings/bookingService'
import type { BookingDocument, BookingStatus } from '../../types/booking'
import type { PropertyDocument } from '../../types/property'
import type { RoomDocument } from '../../types/room'
import { Alert, Field, PageTitle, primaryButtonClass, secondaryButtonClass, Spinner, StatusPill } from '../../components/common/UI'
import { getFirebaseErrorMessage } from '../../utils/validation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase/config'

function statusTone(status: BookingStatus): 'blue' | 'green' | 'red' | 'amber' | 'slate' {
  if (status === 'accepted' || status === 'completed') return 'green'
  if (status === 'rejected' || status === 'cancelled') return 'red'
  if (status === 'pending') return 'amber'
  if (status === 'expired') return 'slate'
  return 'blue'
}

function formatDate(value: string | null): string {
  if (!value) return 'Not specified'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
}

const todayForMoveIn = new Date().toISOString().slice(0, 10)

export function StudentBookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingDocument[]>([])
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({})
  const [roomNames, setRoomNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | BookingStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    if (!profile?.uid) return
    setLoading(true)
    setError('')
    try {
      const items = await getStudentBookings(profile.uid)
      setBookings(items)
      await Promise.all(items.map(async (booking) => {
        const [propertySnapshot, roomSnapshot] = await Promise.all([
          getDoc(doc(db, 'properties', booking.propertyId)),
          getDoc(doc(db, 'rooms', booking.roomId)),
        ])
        if (propertySnapshot.exists()) setPropertyNames((current) => ({ ...current, [booking.propertyId]: String(propertySnapshot.data().propertyName || 'Property') }))
        if (roomSnapshot.exists()) setRoomNames((current) => ({ ...current, [booking.roomId]: String(roomSnapshot.data().roomName || 'Room') }))
      }))
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile?.uid) return
    void getStudentBookings(profile.uid)
      .then((items) => setBookings(items))
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  async function handleCancel(booking: BookingDocument) {
    if (!window.confirm('Cancel this pending booking request?')) return
    setError('')
    setMessage('')
    try {
      await cancelBooking(booking.id!)
      setMessage('Your booking request has been cancelled.')
      await load()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  const filtered = useMemo(() => filter === 'all' ? bookings : bookings.filter((booking) => booking.bookingStatus === filter), [bookings, filter])

  return (
    <>
      <PageTitle eyebrow="Student workspace" title="My bookings" description="Track booking requests and view owner decisions." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'pending', 'accepted', 'rejected', 'cancelled', 'expired', 'completed'] as const).map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${filter === status ? 'bg-[#183b63] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{status}</button>
        ))}
      </div>
      {loading ? <Spinner label="Loading bookings" /> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CalendarDays className="mx-auto text-slate-400" /><h2 className="mt-3 text-lg font-bold text-slate-900">No bookings found</h2><p className="mt-2 text-sm text-slate-500">Submit a booking request from an available room.</p></div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">{propertyNames[booking.propertyId] || 'Property'}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{roomNames[booking.roomId] || 'Room'}</h2></div>
                <StatusPill tone={statusTone(booking.bookingStatus)}>{booking.bookingStatus}</StatusPill>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p className="flex items-center gap-2 text-slate-600"><User size={15} /> {booking.numberOfOccupants} occupant(s)</p>
                <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} /> Move-in {formatDate(booking.moveInDate)}</p>
                <p className="flex items-center gap-2 text-slate-600"><Clock3 size={15} /> {booking.expectedDuration}</p>
                <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} /> Requested {formatDate(booking.createdAt?.toDate().toISOString() || null)}</p>
              </div>
              {booking.studentMessage && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{booking.studentMessage}</p>}
              {booking.rejectionReason && <Alert>Reason: {booking.rejectionReason}</Alert>}
              {booking.bookingStatus === 'completed' && booking.paymentConfirmed && <Alert type="success">Payment confirmed. This room is now occupied for your booking.</Alert>}
              {booking.bookingStatus === 'pending' && <div className="mt-4 flex justify-end"><button type="button" onClick={() => void handleCancel(booking)} className={secondaryButtonClass}>Cancel request</button></div>}
              {booking.bookingStatus === 'completed' && booking.paymentConfirmed && (
                <div className="mt-4 flex justify-end">
                  <Link to={`/student/properties/${booking.propertyId}#property-reviews`} className={primaryButtonClass}>
                    <Star size={16} />
                    Review property
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  )
}

export function OwnerBookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingDocument[]>([])
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({})
  const [roomNames, setRoomNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'new' | 'pending' | 'accepted' | 'history'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    if (!profile?.uid) return
    setLoading(true)
    setError('')
    try {
      const items = await getOwnerBookings(profile.uid)
      setBookings(items)
      await Promise.all(items.map(async (booking) => {
        const [propertySnapshot, roomSnapshot] = await Promise.all([
          getDoc(doc(db, 'properties', booking.propertyId)),
          getDoc(doc(db, 'rooms', booking.roomId)),
        ])
        if (propertySnapshot.exists()) setPropertyNames((current) => ({ ...current, [booking.propertyId]: String(propertySnapshot.data().propertyName || 'Property') }))
        if (roomSnapshot.exists()) setRoomNames((current) => ({ ...current, [booking.roomId]: String(roomSnapshot.data().roomName || 'Room') }))
      }))
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile?.uid) return
    void getOwnerBookings(profile.uid)
      .then((items) => setBookings(items))
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  async function handleAccept(booking: BookingDocument) {
    if (!window.confirm(`Accept this request for ${booking.numberOfOccupants} occupant(s)?`)) return
    try {
      await acceptBooking(booking.id!)
      setMessage('The booking has been accepted.')
      await load()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  async function handleReject(booking: BookingDocument) {
    if (!window.confirm('Reject this booking request?')) return
    const reason = window.prompt('Optional rejection reason:', '') || ''
    try {
      await rejectBooking(booking.id!, reason)
      setMessage('The booking has been rejected.')
      await load()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  async function handleConfirmPayment(booking: BookingDocument) {
    if (!window.confirm('Confirm that payment was made and mark this booking as occupied?')) return
    try {
      await confirmPaymentAndOccupancy(booking.id!)
      setMessage('Payment confirmed. The room occupancy has been updated.')
      await load()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  async function handleCancelAccepted(booking: BookingDocument) {
    if (!window.confirm('Cancel this accepted booking because payment was not made?')) return
    const reason = window.prompt('Optional cancellation reason:', '') || ''
    try {
      await cancelAcceptedBookingByOwner(booking.id!, reason)
      setMessage('The unpaid accepted booking was cancelled.')
      await load()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings
    if (filter === 'new' || filter === 'pending') return bookings.filter((booking) => booking.bookingStatus === 'pending')
    if (filter === 'accepted') return bookings.filter((booking) => booking.bookingStatus === 'accepted')
    return bookings.filter((booking) => ['rejected', 'cancelled', 'expired', 'completed'].includes(booking.bookingStatus))
  }, [bookings, filter])

  const counts = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((booking) => booking.bookingStatus === 'pending').length,
    accepted: bookings.filter((booking) => booking.bookingStatus === 'accepted').length,
    rejected: bookings.filter((booking) => booking.bookingStatus === 'rejected').length,
    cancelled: bookings.filter((booking) => booking.bookingStatus === 'cancelled').length,
    completed: bookings.filter((booking) => booking.bookingStatus === 'completed').length,
  }), [bookings])

  return (
    <>
      <PageTitle eyebrow="Owner workspace" title="Booking management" description="Review student requests and manage confirmed bookings." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[['Total', counts.total], ['Pending', counts.pending], ['Accepted', counts.accepted], ['Rejected', counts.rejected], ['Cancelled', counts.cancelled], ['Completed', counts.completed]].map(([label, count]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{count}</p></div>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'new', 'pending', 'accepted', 'history'] as const).map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${filter === status ? 'bg-[#183b63] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{status}</button>
        ))}
      </div>
      {loading ? <Spinner label="Loading booking requests" /> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CalendarDays className="mx-auto text-slate-400" /><h2 className="mt-3 text-lg font-bold text-slate-900">No booking requests found</h2></div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">{propertyNames[booking.propertyId] || 'Property'}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{roomNames[booking.roomId] || 'Room'}</h2></div>
                <StatusPill tone={statusTone(booking.bookingStatus)}>{booking.bookingStatus}</StatusPill>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p className="flex items-center gap-2 text-slate-600"><User size={15} /> {booking.studentName}</p>
                <p className="flex items-center gap-2 text-slate-600"><Mail size={15} /> {booking.studentEmail}</p>
                <p className="flex items-center gap-2 text-slate-600"><Phone size={15} /> {booking.studentPhone}</p>
                <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} /> Move-in {formatDate(booking.moveInDate)}</p>
                <p className="flex items-center gap-2 text-slate-600"><User size={15} /> {booking.numberOfOccupants} occupant(s)</p>
                <p className="flex items-center gap-2 text-slate-600"><Clock3 size={15} /> {booking.expectedDuration}</p>
                <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} /> Requested {formatDate(booking.createdAt?.toDate().toISOString() || null)}</p>
              </div>
              {booking.studentMessage && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{booking.studentMessage}</p>}
              {booking.rejectionReason && <div className="mt-3"><Alert>Reason: {booking.rejectionReason}</Alert></div>}
              {booking.bookingStatus === 'pending' && <div className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => void handleReject(booking)} className={secondaryButtonClass}>Reject</button><button type="button" onClick={() => void handleAccept(booking)} className={primaryButtonClass}><CheckCircle2 size={16} /> Accept request</button></div>}
              {booking.bookingStatus === 'accepted' && (
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={() => void handleCancelAccepted(booking)} className={secondaryButtonClass}>Cancel — payment not made</button>
                  <button type="button" onClick={() => void handleConfirmPayment(booking)} className={primaryButtonClass}><CheckCircle2 size={16} /> {booking.paymentConfirmed ? 'Finalize as completed' : 'Payment made — confirm occupied'}</button>
                </div>
              )}
              {booking.bookingStatus === 'completed' && booking.paymentConfirmed && <div className="mt-4"><Alert type="success">Payment confirmed and room occupancy updated.</Alert></div>}
            </article>
          ))}
        </div>
      )}
    </>
  )
}

export function BookingRequestForm({
  property,
  room,
  onClose,
  onSubmitted,
}: {
  property: PropertyDocument
  room: RoomDocument
  onClose: () => void
  onSubmitted: () => void
}) {
  const { profile } = useAuth()
  const [studentPhone, setStudentPhone] = useState(profile?.phoneNumber || '')
  const [moveInDate, setMoveInDate] = useState('')
  const [expectedDuration, setExpectedDuration] = useState('')
  const [numberOfOccupants, setNumberOfOccupants] = useState(1)
  const [studentMessage, setStudentMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!moveInDate || !expectedDuration.trim()) return setError('Complete the move-in date and expected duration.')
    if (!studentPhone.trim()) return setError('A student phone number is required.')
    if (numberOfOccupants < 1 || numberOfOccupants > room.availableSpaces) return setError(`The room has ${room.availableSpaces} available space(s).`)
    if (!confirmed) return setError('Confirm the booking summary before submitting.')
    setBusy(true)
    try {
      await submitBookingRequest({
        propertyId: property.id!,
        roomId: room.id!,
        studentPhone,
        moveInDate,
        expectedDuration,
        numberOfOccupants,
        studentMessage,
      })
      onSubmitted()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Booking request</p><h2 className="mt-1 text-xl font-bold text-slate-900">{room.roomName}</h2></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close booking form"><XCircle size={20} /></button>
        </div>
        <form onSubmit={submitRequest} className="grid gap-5 p-5 sm:p-6">
          {error && <Alert>{error}</Alert>}
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <p className="text-sm text-slate-600"><span className="block text-xs text-slate-500">Property</span><strong className="text-slate-900">{property.propertyName}</strong></p>
            <p className="text-sm text-slate-600"><span className="block text-xs text-slate-500">Room</span><strong className="text-slate-900">{room.roomName}</strong></p>
            <p className="text-sm text-slate-600"><span className="block text-xs text-slate-500">Monthly rent</span><strong className="text-slate-900">LKR {room.monthlyPrice.toLocaleString('en-LK')}</strong></p>
            <p className="text-sm text-slate-600"><span className="block text-xs text-slate-500">Advance payment</span><strong className="text-slate-900">LKR {room.advancePayment.toLocaleString('en-LK')}</strong></p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student name" value={profile?.fullName || ''} disabled />
            <Field label="Student email" value={profile?.email || ''} disabled />
            <Field label="Student phone number" value={studentPhone} onChange={(event) => setStudentPhone(event.target.value)} required />
            <Field label="Preferred move-in date" type="date" value={moveInDate} min={todayForMoveIn} onChange={(event) => setMoveInDate(event.target.value)} required />
            <Field label="Expected duration" value={expectedDuration} onChange={(event) => setExpectedDuration(event.target.value)} placeholder="Example: 6 months" required />
            <Field label="Number of occupants" type="number" min="1" max={room.availableSpaces} value={numberOfOccupants} onChange={(event) => setNumberOfOccupants(Number(event.target.value))} required />
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Additional message<textarea value={studentMessage} onChange={(event) => setStudentMessage(event.target.value)} className="min-h-[110px] rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-normal outline-none focus:border-blue-500" maxLength={1000} placeholder="Tell the owner about your accommodation needs." /></label>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-900">Confirm booking summary</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <span>{property.propertyName}</span><span>{room.roomName}</span>
              <span>{room.availableSpaces} available space(s)</span><span>{numberOfOccupants} occupant(s)</span>
              <span>Move-in: {moveInDate || 'Not selected'}</span><span>No payment is collected now</span>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm that I want to submit this booking request</label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button><button type="submit" className={primaryButtonClass} disabled={busy}>{busy ? 'Submitting…' : 'Submit booking request'}</button></div>
        </form>
      </div>
    </div>
  )
}
