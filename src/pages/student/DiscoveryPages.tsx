import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Building2, Filter, MapPin, Search, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Field, PageTitle, primaryButtonClass, secondaryButtonClass, Spinner, StatusPill } from '../../components/common/UI'
import { useAuth } from '../../contexts/AuthContext'
import { getStudentBookings } from '../../services/bookings/bookingService'
import { getAvailableRooms, getAvailableRoomsForProperty, getDiscoverableProperties, getDiscoverableProperty } from '../../services/discovery/discoveryService'
import { getPropertyReviews, savePropertyReview } from '../../services/reviews/reviewService'
import type { PropertyReview } from '../../types/review'
import type { BookingDocument } from '../../types/booking'
import type { PropertyDocument } from '../../types/property'
import type { RoomAvailabilityStatus, RoomDocument, RoomFacility, RoomGenderPolicy, RoomType } from '../../types/room'
import { haversineDistanceKm } from '../../utils/distance'
import { getFirebaseErrorMessage } from '../../utils/validation'
import { BookingRequestForm } from '../shared/BookingPages'

const campuses = [
  { value: 'SLIIT Malabe', label: 'SLIIT Malabe', latitude: 6.9147, longitude: 79.9724 },
  { value: 'University of Moratuwa', label: 'University of Moratuwa', latitude: 6.7969, longitude: 79.9001 },
  { value: 'University of Colombo', label: 'University of Colombo', latitude: 6.9003, longitude: 79.8583 },
  { value: 'University of Kelaniya', label: 'University of Kelaniya', latitude: 6.9747, longitude: 79.9153 },
  { value: 'University of Sri Jayewardenepura', label: 'University of Sri Jayewardenepura', latitude: 6.8528, longitude: 79.9071 },
  { value: 'University of Peradeniya', label: 'University of Peradeniya', latitude: 7.2547, longitude: 80.5974 },
  { value: 'University of Ruhuna', label: 'University of Ruhuna', latitude: 5.941, longitude: 80.576 },
]

const priceRanges = [
  { value: '0-10000', label: 'Below Rs. 10,000', min: 0, max: 9999 },
  { value: '10000-15000', label: 'Rs. 10,000–15,000', min: 10000, max: 15000 },
  { value: '15000-20000', label: 'Rs. 15,000–20,000', min: 15000, max: 20000 },
  { value: '20000-30000', label: 'Rs. 20,000–30,000', min: 20000, max: 30000 },
  { value: '30000+', label: 'Above Rs. 30,000', min: 30000, max: Number.POSITIVE_INFINITY },
]

const roomTypes: Array<{ value: RoomType; label: string }> = [
  { value: 'single', label: 'Single room' },
  { value: 'double', label: 'Double room' },
  { value: 'triple', label: 'Triple room' },
  { value: 'shared', label: 'Shared room' },
  { value: 'other', label: 'Other' },
]

const roomFacilities: Array<{ value: FacilityFilter; label: string }> = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'bed', label: 'Bed' },
  { value: 'mattress', label: 'Mattress' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'study_table', label: 'Study table' },
  { value: 'chair', label: 'Chair' },
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'fan', label: 'Fan' },
  { value: 'attached_bathroom', label: 'Attached bathroom' },
  { value: 'shared_bathroom', label: 'Shared bathroom' },
  { value: 'parking', label: 'Parking' },
  { value: 'meals', label: 'Meals' },
  { value: 'water', label: 'Water facilities' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'other', label: 'Other' },
]

type GenderFilter = 'all' | RoomGenderPolicy
type AvailabilityFilter = 'all' | 'available' | 'partially_available'
type DistanceFilter = 'any' | '1' | '3' | '5' | '10'
type FacilityFilter = RoomFacility | 'parking' | 'meals' | 'water'

function roomStatusTone(status: RoomAvailabilityStatus): 'green' | 'amber' | 'red' | 'slate' {
  return status === 'available' ? 'green' : status === 'partially_available' ? 'amber' : status === 'occupied' ? 'red' : 'slate'
}

function roomStatusLabel(status: RoomAvailabilityStatus): string {
  return status.replaceAll('_', ' ')
}

function roomTypeLabel(type: RoomType): string {
  return roomTypes.find((option) => option.value === type)?.label || type
}

function formatPrice(value: number): string {
  return `LKR ${value.toLocaleString('en-LK')}`
}

function formatRoomTimestamp(room: RoomDocument): string {
  const timestamp = room.updatedAt || room.createdAt
  return timestamp?.toDate().toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) || 'Recently'
}

function isNewRoom(room: RoomDocument): boolean {
  const created = room.createdAt?.toDate()
  if (!created) return false
  return Date.now() - created.getTime() <= 7 * 24 * 60 * 60 * 1000
}

function propertyFacilities(property: PropertyDocument): string[] {
  return property.facilities.map((facility) => facility === 'meals_provided' ? 'meals' : facility)
}

function roomHasFacility(room: RoomDocument, property: PropertyDocument, facility: FacilityFilter): boolean {
  const roomFacility: RoomFacility | null = facility === 'parking' || facility === 'meals' || facility === 'water' ? null : facility
  return (roomFacility !== null && room.facilities.includes(roomFacility)) || propertyFacilities(property).includes(facility)
}

function roomMatchesGender(room: RoomDocument, property: PropertyDocument, gender: GenderFilter): boolean {
  if (gender === 'all') return true
  const propertyAllows = property.genderPolicy === 'mixed' || property.genderPolicy === gender
  const roomAllows = room.genderPolicy === 'mixed' || room.genderPolicy === gender
  return propertyAllows && roomAllows
}

function distanceFor(property: PropertyDocument, campusValue: string): number | null {
  const campus = campuses.find((item) => item.value === campusValue)
  const latitude = property.location.latitude
  const longitude = property.location.longitude
  if (!campus || typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return haversineDistanceKm(campus.latitude, campus.longitude, latitude, longitude)
}

function PropertyPlaceholder() {
  return <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 text-[#2b65a0]"><Building2 size={42} strokeWidth={1.5} /></div>
}

export function StudentSearchPage() {
  const { profile } = useAuth()
  const [properties, setProperties] = useState<PropertyDocument[]>([])
  const [rooms, setRooms] = useState<RoomDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState('')
  const [gender, setGender] = useState<GenderFilter>('all')
  const [priceRange, setPriceRange] = useState('')
  const [minimumPrice, setMinimumPrice] = useState('')
  const [maximumPrice, setMaximumPrice] = useState('')
  const [roomType, setRoomType] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [distance, setDistance] = useState<DistanceFilter>('any')
  const [selectedFacilities, setSelectedFacilities] = useState<FacilityFilter[]>([])

  useEffect(() => {
    if (!profile?.uid) return
    void Promise.all([getDiscoverableProperties(), getAvailableRooms()])
      .then(([propertyItems, roomItems]) => {
        setProperties(propertyItems)
        setRooms(roomItems)
      })
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  const results = useMemo(() => {
    const selectedRange = priceRanges.find((range) => range.value === priceRange)
    const minimum = minimumPrice === '' ? selectedRange?.min ?? 0 : Number(minimumPrice)
    const maximum = maximumPrice === '' ? selectedRange?.max ?? Number.POSITIVE_INFINITY : Number(maximumPrice)
    const normalizedSearch = search.trim().toLowerCase()
    return properties.map((property) => {
      const propertyRooms = rooms.filter((room) => room.propertyId === property.id)
      const matchingRooms = propertyRooms.filter((room) => {
        const searchable = `${property.propertyName} ${property.location.city} ${property.location.district} ${property.location.address} ${property.location.nearbyCampus}`.toLowerCase()
        const campusMatches = !campus || (campus === 'Other' ? !campuses.some((item) => property.location.nearbyCampus.toLowerCase().includes(item.value.toLowerCase())) : property.location.nearbyCampus.toLowerCase().includes(campus.toLowerCase()))
        const selectedDistance = distanceFor(property, campus)
        const distanceMatches = distance === 'any' || (selectedDistance !== null && selectedDistance <= Number(distance))
        return (!normalizedSearch || searchable.includes(normalizedSearch))
          && campusMatches
          && roomMatchesGender(room, property, gender)
          && room.monthlyPrice >= minimum
          && room.monthlyPrice <= maximum
          && (!roomType || room.roomType === roomType)
          && (availability === 'all' || room.availabilityStatus === availability)
          && distanceMatches
          && selectedFacilities.every((facility) => roomHasFacility(room, property, facility))
      })
      return { property, rooms: matchingRooms, distance: distanceFor(property, campus) }
    }).filter((result) => result.rooms.length > 0)
  }, [availability, campus, distance, gender, maximumPrice, minimumPrice, priceRange, properties, roomType, rooms, search, selectedFacilities])

  function toggleFacility(facility: FacilityFilter) {
    setSelectedFacilities((current) => current.includes(facility) ? current.filter((item) => item !== facility) : [...current, facility])
  }

  if (!profile || profile.role !== 'student') return <Alert>Only student accounts can search for boarding accommodation.</Alert>
  return (
    <>
      <PageTitle eyebrow="Student workspace" title="Find your next place to stay" description="Browse approved boarding properties with rooms that currently have available spaces." />
      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 font-bold text-slate-900"><Filter size={17} /> Filters</div>
          <div className="mt-5 grid gap-4">
            <div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property or location" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Campus<select value={campus} onChange={(event) => setCampus(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-2 font-normal"><option value="">All campuses</option>{campuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}<option value="Other">Other</option></select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Gender policy<select value={gender} onChange={(event) => setGender(event.target.value as GenderFilter)} className="h-10 rounded-lg border border-slate-200 px-2 font-normal"><option value="all">All</option><option value="boys">Boys only</option><option value="girls">Girls only</option><option value="mixed">Mixed</option></select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Price range<select value={priceRange} onChange={(event) => { setPriceRange(event.target.value); setMinimumPrice(''); setMaximumPrice('') }} className="h-10 rounded-lg border border-slate-200 px-2 font-normal"><option value="">Any price</option>{priceRanges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2"><Field label="Min LKR" type="number" min="0" value={minimumPrice} onChange={(event) => { setMinimumPrice(event.target.value); setPriceRange('') }} /><Field label="Max LKR" type="number" min="0" value={maximumPrice} onChange={(event) => { setMaximumPrice(event.target.value); setPriceRange('') }} /></div>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Room type<select value={roomType} onChange={(event) => setRoomType(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-2 font-normal"><option value="">All room types</option>{roomTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Availability<select value={availability} onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)} className="h-10 rounded-lg border border-slate-200 px-2 font-normal"><option value="all">Any available space</option><option value="available">Fully available</option><option value="partially_available">Partially available</option></select></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Distance from campus<select value={distance} onChange={(event) => setDistance(event.target.value as DistanceFilter)} className="h-10 rounded-lg border border-slate-200 px-2 font-normal"><option value="any">Any distance</option><option value="1">Within 1 km</option><option value="3">Within 3 km</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option></select></label>
            <div><p className="text-sm font-semibold text-slate-700">Facilities</p><div className="mt-2 grid gap-2">{roomFacilities.map((facility) => <label key={facility.value} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={selectedFacilities.includes(facility.value)} onChange={() => toggleFacility(facility.value)} className="size-4 rounded accent-[#183b63]" /> {facility.label}</label>)}</div></div>
          </div>
        </aside>
        <main>
          <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{loading ? 'Loading properties…' : `${results.length} ${results.length === 1 ? 'property' : 'properties'} found`}</p>{campus && <span className="text-xs text-slate-400">Distance is shown when coordinates are available</span>}</div>
          {loading ? <div className="grid gap-4 sm:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div> : results.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Building2 className="mx-auto text-slate-400" size={32} /><h2 className="mt-4 text-xl font-bold text-slate-900">No matching boarding places</h2><p className="mt-2 text-sm text-slate-500">Try widening your search or removing one of the filters.</p></div> : <div className="grid gap-5 sm:grid-cols-2">{results.map(({ property, rooms: matchingRooms, distance: propertyDistance }) => { const lowestPrice = Math.min(...matchingRooms.map((room) => room.monthlyPrice)); const spaces = matchingRooms.reduce((total, room) => total + room.availableSpaces, 0); return <article key={property.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><PropertyPlaceholder /><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{property.propertyName}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {property.location.city}, {property.location.district}</p></div><StatusPill tone="green">Verified</StatusPill></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{property.description}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-500">From</p><p className="mt-1 font-semibold">{formatPrice(lowestPrice)}</p></div><div><p className="text-xs text-slate-500">Available spaces</p><p className="mt-1 font-semibold text-emerald-700">{spaces}</p></div><div><p className="text-xs text-slate-500">Campus</p><p className="mt-1 font-semibold">{property.location.nearbyCampus || 'Not specified'}</p></div><div><p className="text-xs text-slate-500">Distance</p><p className="mt-1 font-semibold">{propertyDistance === null ? 'Not available' : `${propertyDistance.toFixed(1)} km`}</p></div></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-xs capitalize text-slate-500">{property.genderPolicy} · {matchingRooms.length} room{matchingRooms.length === 1 ? '' : 's'}</span><Link to={`/student/properties/${property.id}`} className={`${secondaryButtonClass} min-h-9 px-3 text-xs`}>Details &amp; reviews <ArrowRight size={14} /></Link></div></div></article> })}</div>}
        </main>
      </div>
    </>
  )
}

export function StudentPropertyDetailsPage() {
  const { profile } = useAuth()
  const { propertyId } = useParams()
  const [property, setProperty] = useState<PropertyDocument | null>(null)
  const [rooms, setRooms] = useState<RoomDocument[]>([])
  const [reviews, setReviews] = useState<PropertyReview[]>([])
  const [bookings, setBookings] = useState<BookingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomDocument | null>(null)
  const [bookingMessage, setBookingMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  useEffect(() => {
    if (!profile?.uid || !propertyId) return
    void (async () => {
      try {
        const propertyItem = await getDiscoverableProperty(propertyId)
        setProperty(propertyItem)
        if (!propertyItem) return
        const [roomItems, reviewItems, bookingItems] = await Promise.all([
          getAvailableRoomsForProperty(propertyId),
          getPropertyReviews(propertyId),
          getStudentBookings(profile.uid),
        ])
        setRooms(roomItems)
        setReviews(reviewItems)
        setBookings(bookingItems)
        const ownReview = reviewItems.find((review) => review.studentId === profile.uid)
        if (ownReview) {
          setRating(ownReview.rating)
          setReviewText(ownReview.comment)
        }
      } catch (issue) {
        setError(getFirebaseErrorMessage(issue))
      } finally {
        setLoading(false)
      }
    })()
  }, [profile?.uid, propertyId])

  const completedBookings = bookings.filter((booking) =>
    booking.propertyId === propertyId && booking.bookingStatus === 'completed' && booking.paymentConfirmed === true,
  )
  const ownReview = reviews.find((review) => review.studentId === profile?.uid)
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !propertyId || completedBookings.length === 0) return
    setReviewError('')
    setReviewMessage('')
    setSavingReview(true)
    let reviewSaved = false
    try {
      await savePropertyReview({
        propertyId,
        bookingId: ownReview?.bookingId ?? completedBookings[0].bookingId,
        studentName: profile.fullName,
        rating,
        comment: reviewText,
        existingReview: ownReview,
      })
      reviewSaved = true
      const updatedReviews = await getPropertyReviews(propertyId)
      setReviews(updatedReviews)
      setReviewMessage(ownReview ? 'Your review has been updated.' : 'Thanks for sharing your experience.')
    } catch (issue) {
      const message = getFirebaseErrorMessage(issue)
      setReviewError(reviewSaved
        ? `Your review was saved, but could not be reloaded. Refresh the page to see it. ${message}`
        : `${message} The review write may be blocked if the latest Firestore rules have not been deployed or your booking is not confirmed as completed.`)
    } finally {
      setSavingReview(false)
    }
  }

  if (loading) return <Spinner label="Loading property details" />
  if (error) return <Alert>{error}</Alert>
  if (!property) return <Alert>This property is not available.</Alert>
  return (
    <>
      {bookingMessage && <div className="mb-5"><Alert type="success">{bookingMessage}</Alert></div>}
      <PageTitle
        eyebrow="Student workspace"
        title={property.propertyName}
        description="Approved boarding property details and rooms currently accepting occupants."
        action={
          <div className="flex flex-wrap gap-2">
            <a href="#property-reviews" className={secondaryButtonClass}>Read reviews ({reviews.length})</a>
            <Link to="/student/search" className={secondaryButtonClass}>Back to search</Link>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <PropertyPlaceholder />
          <h2 className="mt-5 text-xl font-bold text-slate-900">Property information</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div><dt className="text-slate-500">Location</dt><dd className="mt-1 font-semibold">{property.location.address}, {property.location.city}, {property.location.district}</dd></div>
            <div><dt className="text-slate-500">Nearby campus</dt><dd className="mt-1 font-semibold">{property.location.nearbyCampus || 'Not specified'}</dd></div>
            <div><dt className="text-slate-500">Distance from campus</dt><dd className="mt-1 font-semibold">{property.location.distanceFromCampus?.replaceAll('_', ' ') || 'Not specified'}</dd></div>
            <div><dt className="text-slate-500">Gender policy</dt><dd className="mt-1 font-semibold capitalize">{property.genderPolicy}</dd></div>
            <div><dt className="text-slate-500">Facilities</dt><dd className="mt-1 capitalize">{property.facilities.map((facility) => facility.replaceAll('_', ' ')).join(', ') || 'Not specified'}</dd></div>
          </dl>
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Available rooms</h2>
            <span className="text-sm text-slate-500">{rooms.length} found</span>
          </div>
          {rooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No rooms currently have available spaces.</div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <article key={room.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{room.roomName}</h3>
                        {isNewRoom(room) && <StatusPill tone="blue">New</StatusPill>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{roomTypeLabel(room.roomType)} · {formatPrice(room.monthlyPrice)} per month</p>
                    </div>
                    <StatusPill tone={roomStatusTone(room.availabilityStatus)}>{roomStatusLabel(room.availabilityStatus)}</StatusPill>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><p className="text-xs text-slate-500">Advance</p><p className="mt-1 font-semibold">{formatPrice(room.advancePayment)}</p></div>
                    <div><p className="text-xs text-slate-500">Capacity</p><p className="mt-1 font-semibold">{room.maximumOccupants}</p></div>
                    <div><p className="text-xs text-slate-500">Occupants</p><p className="mt-1 font-semibold">{room.currentOccupants}</p></div>
                    <div><p className="text-xs text-slate-500">Spaces left</p><p className="mt-1 font-semibold text-emerald-700">{room.availableSpaces}</p></div>
                  </div>
                  <p className="mt-4 text-sm capitalize text-slate-600">{room.genderPolicy} · {room.sharingArrangement.replace('_', ' ')} · {room.facilities.map((facility) => facility.replaceAll('_', ' ')).join(', ') || 'No facilities listed'}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-500">Last updated: {formatRoomTimestamp(room)}</span>
                    <button type="button" onClick={() => setSelectedRoom(room)} className={secondaryButtonClass}>Request booking</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <section id="property-reviews" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Reviews</h2>
            <p className="mt-1 text-sm text-slate-500">Ratings and experiences from students who stayed here.</p>
          </div>
          <div className="flex items-center gap-2" aria-label={reviews.length ? `Rated ${averageRating.toFixed(1)} out of 5 from ${reviews.length} reviews` : 'No reviews yet'}>
            <Star size={18} className="fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-900">{reviews.length ? averageRating.toFixed(1) : '—'}</span>
            <span className="text-sm text-slate-500">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            {completedBookings.length > 0 ? (
              <form onSubmit={(event) => void handleReviewSubmit(event)} className="rounded-xl bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900">{ownReview ? 'Edit your review' : 'Share your experience'}</h3>
                <p className="mt-1 text-sm text-slate-500">Only students with a completed stay can leave a review.</p>
                <fieldset className="mt-4">
                  <legend className="text-sm font-semibold text-slate-700">Your rating</legend>
                  <div className="mt-2 flex gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                        aria-pressed={rating === value}
                        className="rounded p-1 text-amber-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <Star size={25} className={value <= rating ? 'fill-amber-400' : 'fill-transparent'} />
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="property-review" className="mt-4 block text-sm font-semibold text-slate-700">Your review</label>
                <textarea
                  id="property-review"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  rows={4}
                  minLength={10}
                  maxLength={1000}
                  required
                  placeholder="What was your stay like?"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{reviewText.length}/1,000</p>
                {reviewError && <div className="mt-3"><Alert>{reviewError}</Alert></div>}
                {reviewMessage && <div className="mt-3"><Alert type="success">{reviewMessage}</Alert></div>}
                <button type="submit" disabled={savingReview || rating === 0} className={`${primaryButtonClass} mt-4 w-full`}>
                  {savingReview ? 'Saving review…' : ownReview ? 'Update review' : 'Submit review'}
                </button>
              </form>
            ) : (
              <div className="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Complete a stay at this property to share a rating and review.
              </div>
            )}
          </div>
          <div className="grid content-start gap-3">
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No reviews yet. Be the first to share your experience after your stay.</div>
            ) : reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{review.studentName}</p>
                  <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star key={value} size={15} className={value <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                    ))}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.comment}</p>
                <p className="mt-3 text-xs text-slate-400">{review.createdAt?.toDate().toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) || 'Recently'}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {selectedRoom && <BookingRequestForm property={property} room={selectedRoom} onClose={() => setSelectedRoom(null)} onSubmitted={() => { setSelectedRoom(null); setBookingMessage('Your booking request was submitted successfully.') }} />}
    </>
  )
}
