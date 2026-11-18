import { useEffect, useMemo, useState } from 'react'
import { BedDouble, MapPin, Phone, Search, Users } from 'lucide-react'
import { Alert, Field, PageTitle, Spinner } from '../components/common/UI'
import { getPublishedBoardings } from '../services/boardings/boardingService'
import type { BoardingListing } from '../types/boarding'
import { getFirebaseErrorMessage } from '../utils/validation'

const rentFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

const genderLabels: Record<BoardingListing['genderPreference'], string> = {
  male: 'Male students',
  female: 'Female students',
  any: 'All students',
}

export function StudentBoardingsPage() {
  const [listings, setListings] = useState<BoardingListing[]>([])
  const [search, setSearch] = useState('')
  const [maxRent, setMaxRent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getPublishedBoardings()
      .then((results) => {
        if (active) setListings(results)
      })
      .catch((issue: unknown) => {
        if (active) setError(getFirebaseErrorMessage(issue))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const visibleListings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    const rentLimit = maxRent ? Number(maxRent) : Infinity

    return listings.filter((listing) => {
      const location = `${listing.name} ${listing.address} ${listing.city} ${listing.district}`.toLocaleLowerCase()
      return location.includes(term) && listing.monthlyRent <= rentLimit
    })
  }, [listings, maxRent, search])

  return (
    <>
      <PageTitle
        eyebrow="Student workspace"
        title="Find a boarding"
        description="Explore available student accommodation, compare monthly rent and facilities, and contact the boarding owner."
      />

      <section className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_220px] sm:p-5">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-700">Search by boarding or location</span>
          <span className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try Colombo or Kandy"
            />
          </span>
        </label>
        <Field
          label="Maximum monthly rent (LKR)"
          type="number"
          min="0"
          step="1000"
          value={maxRent}
          onChange={(event) => setMaxRent(event.target.value)}
          placeholder="Any budget"
        />
      </section>

      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Spinner label="Loading available boardings" />
      ) : error ? null : listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No boardings listed yet</h2>
          <p className="mt-2 text-sm text-slate-500">Please check back soon for available student accommodation.</p>
        </div>
      ) : visibleListings.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No matching boardings</h2>
          <p className="mt-2 text-sm text-slate-500">Try another area or increase your maximum rent.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visibleListings.map((listing) => (
            <article key={listing.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{listing.name}</h2>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <span>{listing.address}, {listing.city}, {listing.district}</span>
                  </p>
                </div>
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-[#183b63]">
                  {rentFormatter.format(listing.monthlyRent)}<span className="font-medium"> / month</span>
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <p className="text-sm leading-6 text-slate-600">{listing.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><BedDouble size={14} />{listing.roomType}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><Users size={14} />{listing.availableRooms} rooms available</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">{genderLabels[listing.genderPreference]}</span>
                </div>

                {listing.facilities.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Facilities</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {listing.facilities.map((facility) => (
                        <li key={facility} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600">{facility}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <a
                  href={`tel:${listing.contactPhone.replace(/[^\d+]/g, '')}`}
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#183b63] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#102d4d] focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  <Phone size={16} /> Contact owner
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
