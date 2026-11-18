import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert, PageTitle, primaryButtonClass, secondaryButtonClass, Spinner, StatusPill } from '../../components/common/UI'
import { useAuth } from '../../contexts/AuthContext'
import { getOwnerFeaturedListings, markFeaturedListingPaid } from '../../services/featuredListings/featuredListingService'
import { getOwnerProperties } from '../../services/properties/propertyService'
import { getOwnerRooms } from '../../services/rooms/roomService'
import type { FeaturedListingDocument } from '../../types/featuredListing'
import type { PropertyDocument } from '../../types/property'
import type { RoomDocument } from '../../types/room'
import { getFirebaseErrorMessage } from '../../utils/validation'

function formatListingDate(value: FeaturedListingDocument['expiresAt']): string {
  return value?.toDate().toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) || '—'
}

export function FeaturedListingPage() {
  const { profile } = useAuth()
  const [rooms, setRooms] = useState<RoomDocument[]>([])
  const [properties, setProperties] = useState<PropertyDocument[]>([])
  const [listings, setListings] = useState<FeaturedListingDocument[]>([])
  const [activeRoomIds, setActiveRoomIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busyRoomId, setBusyRoomId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!profile?.uid) return
    void Promise.all([
      getOwnerRooms(profile.uid),
      getOwnerProperties(profile.uid),
      getOwnerFeaturedListings(profile.uid),
    ])
      .then(([roomItems, propertyItems, listingItems]) => {
        setRooms(roomItems)
        setProperties(propertyItems)
        setListings(listingItems)
        const now = Date.now()
        setActiveRoomIds(listingItems
          .filter((listing) => listing.status === 'approved' && (listing.expiresAt?.toMillis() ?? 0) > now)
          .map((listing) => listing.roomId))
      })
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  const approvedPropertyIds = new Set(properties
    .filter((property) => property.approvalStatus === 'approved')
    .map((property) => property.id))
  const eligibleRooms = rooms.filter((room) =>
    room.isActive && room.availableSpaces > 0 && approvedPropertyIds.has(room.propertyId),
  )
  const listingByRoomId = new Map(listings.map((listing) => [listing.roomId, listing]))
  const propertyById = new Map(properties.map((property) => [property.id, property]))

  async function submitPayment(roomId: string) {
    setBusyRoomId(roomId)
    setError('')
    setMessage('')
    try {
      await markFeaturedListingPaid(roomId)
      setListings(await getOwnerFeaturedListings(profile!.uid))
      setMessage('Payment marked as made. The administrator will review it before your room is promoted.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusyRoomId('')
    }
  }

  if (!profile || profile.role !== 'owner') return <Alert>Only boarding owners can request featured listings.</Alert>
  if (loading) return <Spinner label="Loading your rooms" />

  return (
    <>
      <PageTitle
        eyebrow="Owner workspace"
        title="Promote a room"
        description="Upgrade a room to Pro to place it ahead of standard rooms in student search."
        action={<StatusPill tone="blue">LKR 200 · 30 days</StatusPill>}
      />
      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      {message && <div className="mb-5"><Alert type="success">{message}</Alert></div>}

      <section className="mb-6 grid gap-6 rounded-2xl border border-blue-100 bg-white p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <div className="flex items-center gap-2 text-[#183b63]"><Sparkles size={20} /><h2 className="text-lg font-bold">How to get your room featured</h2></div>
          <ol className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
            <li>1. Transfer LKR 200 to the bank account below for each room you want to feature.</li>
            <li>2. Include your boarding name in the bank transfer description or reference.</li>
            <li>3. Select that room and click “I’ve paid” to notify the administrator.</li>
            <li>4. After the administrator verifies your payment, your room appears ahead of standard listings for 30 days.</li>
          </ol>
        </div>
        <div className="min-w-64 rounded-xl bg-slate-50 p-5 text-sm">
          <h3 className="font-bold text-slate-900">Bank transfer details</h3>
          <dl className="mt-3 grid gap-2">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Bank</dt><dd className="font-semibold text-slate-800">Commercial Bank</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Account name</dt><dd className="font-semibold text-slate-800">V.S.O.Perera</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Account number</dt><dd className="font-semibold text-slate-800">8029060807</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Branch</dt><dd className="font-semibold text-slate-800">Horana Branch</dd></div>
            <div className="border-t border-slate-200 pt-2"><dt className="text-slate-500">Transfer reference</dt><dd className="mt-1 font-semibold text-slate-800">Include your boarding name</dd></div>
          </dl>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Choose a room to feature</h2>
        <span className="text-sm text-slate-500">LKR 200 per room · 30 days</span>
      </div>
      {eligibleRooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Building2 className="mx-auto text-slate-400" size={30} />
          <h3 className="mt-3 font-bold text-slate-900">No eligible rooms yet</h3>
          <p className="mt-2 text-sm text-slate-500">Add an active room with available spaces to an approved property before promoting it.</p>
          <Link to="/owner/rooms" className={`${secondaryButtonClass} mt-4`}>Manage rooms</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {eligibleRooms.map((room) => {
            const listing = listingByRoomId.get(room.id || '')
            const active = activeRoomIds.includes(room.id || '')
            const pending = listing?.status === 'pending'
            return (
              <article key={room.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700">{propertyById.get(room.propertyId)?.propertyName || 'Boarding property'}</p>
                  <h3 className="mt-1 font-bold text-slate-900">{room.roomName}</h3>
                  <p className="mt-1 text-sm text-slate-500">LKR {room.monthlyPrice.toLocaleString('en-LK')} per month · {room.availableSpaces} space{room.availableSpaces === 1 ? '' : 's'} available</p>
                  {active && <p className="mt-1 text-xs text-emerald-700">Pro listing active until {formatListingDate(listing?.expiresAt ?? null)}.</p>}
                  {pending && <p className="mt-1 text-xs text-amber-700">Payment submitted; waiting for administrator approval.</p>}
                  {listing?.status === 'rejected' && listing.rejectionReason && <p className="mt-1 text-xs text-rose-700">{listing.rejectionReason}</p>}
                </div>
                {active ? (
                  <StatusPill tone="green"><CheckCircle2 className="mr-1 inline" size={14} /> Pro active</StatusPill>
                ) : pending ? (
                  <StatusPill tone="amber"><Clock3 className="mr-1 inline" size={14} /> Awaiting review</StatusPill>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitPayment(room.id!)}
                    disabled={busyRoomId === room.id}
                    className={primaryButtonClass}
                  >
                    {busyRoomId === room.id ? 'Submitting…' : 'I’ve paid — notify admin'}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
