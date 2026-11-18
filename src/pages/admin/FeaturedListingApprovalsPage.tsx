import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Sparkles, XCircle } from 'lucide-react'
import { Alert, PageTitle, primaryButtonClass, secondaryButtonClass, Spinner, StatusPill } from '../../components/common/UI'
import { getPendingFeaturedListings, reviewFeaturedListing } from '../../services/featuredListings/featuredListingService'
import { db } from '../../services/firebase/config'
import type { FeaturedListingDocument } from '../../types/featuredListing'
import { getFirebaseErrorMessage } from '../../utils/validation'
import { doc, getDoc } from 'firebase/firestore'

interface FeaturedListingReviewItem {
  listing: FeaturedListingDocument
  roomName: string
  propertyName: string
  ownerName: string
  ownerEmail: string
  canApprove: boolean
}

function formatPaymentDate(listing: FeaturedListingDocument): string {
  return listing.paymentMarkedAt?.toDate().toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }) || '—'
}

export function FeaturedListingApprovalsPage() {
  const [requests, setRequests] = useState<FeaturedListingReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyRoomId, setBusyRoomId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const fetchRequests = useCallback(async (): Promise<FeaturedListingReviewItem[]> => {
    const listings = await getPendingFeaturedListings()
    return Promise.all(listings.map(async (listing): Promise<FeaturedListingReviewItem> => {
      const [roomSnapshot, propertySnapshot, ownerSnapshot] = await Promise.all([
        getDoc(doc(db, 'rooms', listing.roomId)),
        getDoc(doc(db, 'properties', listing.propertyId)),
        getDoc(doc(db, 'users', listing.ownerId)),
      ])
      return {
        listing,
        roomName: roomSnapshot.exists() ? String(roomSnapshot.data().roomName || 'Room') : 'Room no longer available',
        propertyName: propertySnapshot.exists() ? String(propertySnapshot.data().propertyName || 'Boarding property') : 'Boarding property',
        ownerName: ownerSnapshot.exists() ? String(ownerSnapshot.data().fullName || 'Owner') : 'Owner',
        ownerEmail: ownerSnapshot.exists() ? String(ownerSnapshot.data().email || '') : '',
        canApprove: roomSnapshot.exists()
          && roomSnapshot.data().isActive === true
          && Number(roomSnapshot.data().availableSpaces) > 0
          && propertySnapshot.exists()
          && propertySnapshot.data().approvalStatus === 'approved',
      }
    }))
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRequests(await fetchRequests())
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void fetchRequests()
      .then((items) => {
        if (active) setRequests(items)
      })
      .catch((issue: unknown) => {
        if (active) setError(getFirebaseErrorMessage(issue))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [fetchRequests])

  async function review(roomId: string, decision: 'approve' | 'reject') {
    setBusyRoomId(roomId)
    setError('')
    setMessage('')
    try {
      await reviewFeaturedListing(roomId, decision)
      setMessage(decision === 'approve'
        ? 'Payment approved. The room will be featured for 30 days.'
        : 'The featured listing payment was rejected.')
      setLoading(true)
      await load()
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setBusyRoomId('')
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="Administrator workspace"
        title="Featured listing approvals"
        description="Review owner payment confirmations. Approved rooms appear before standard search results for 30 days."
        action={<StatusPill tone="blue">LKR 200 · 30 days</StatusPill>}
      />
      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      {message && <div className="mb-5"><Alert type="success">{message}</Alert></div>}
      {loading ? <Spinner label="Loading featured listing requests" /> : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Sparkles className="mx-auto text-slate-400" size={30} />
          <h2 className="mt-3 text-lg font-bold text-slate-900">No payments awaiting review</h2>
          <p className="mt-2 text-sm text-slate-500">Owner payment confirmations will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(({ listing, roomName, propertyName, ownerName, ownerEmail, canApprove }) => (
            <article key={listing.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-700">{propertyName}</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{roomName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{ownerName}{ownerEmail ? ` · ${ownerEmail}` : ''}</p>
                </div>
                <StatusPill tone="amber"><Clock3 className="mr-1 inline" size={14} /> Payment marked as made</StatusPill>
              </div>
              <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <p><span className="text-slate-500">Amount</span><br /><strong className="text-slate-800">LKR 200</strong></p>
                <p><span className="text-slate-500">Plan</span><br /><strong className="text-slate-800">30 days of Pro</strong></p>
                <p><span className="text-slate-500">Payment marked</span><br /><strong className="text-slate-800">{formatPaymentDate(listing)}</strong></p>
              </div>
              {!canApprove && <div className="mt-4"><Alert>The room is no longer active or available on an approved property, so it cannot be featured.</Alert></div>}
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => void review(listing.roomId, 'reject')}
                  disabled={busyRoomId === listing.roomId}
                  className={secondaryButtonClass}
                >
                  <XCircle size={16} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => void review(listing.roomId, 'approve')}
                  disabled={busyRoomId === listing.roomId || !canApprove}
                  className={primaryButtonClass}
                >
                  <CheckCircle2 size={16} /> {busyRoomId === listing.roomId ? 'Reviewing…' : 'Approve payment'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
