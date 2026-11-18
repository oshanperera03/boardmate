import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'
import {
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/bookings/bookingService'
import type { NotificationDocument } from '../../types/booking'
import { Alert, PageTitle, Spinner } from '../../components/common/UI'
import { getFirebaseErrorMessage } from '../../utils/validation'

function relativeTime(notification: NotificationDocument): string {
  const date = notification.createdAt?.toDate()
  if (!date) return 'Recently'
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function NotificationsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!profile?.uid) return
    setLoading(true)
    setError('')
    void getNotificationHistory(profile.uid)
      .then((page) => {
        setItems(page.items)
        setCursor(page.cursor)
        setHasMore(page.items.length === 20)
      })
      .catch((issue: unknown) => setError(getFirebaseErrorMessage(issue)))
      .finally(() => setLoading(false))
  }, [profile?.uid])

  async function openNotification(notification: NotificationDocument) {
    setError('')
    try {
      if (notification.id && !notification.isRead) await markNotificationRead(notification.id)
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item))
      if (notification.bookingId || notification.relatedBookingId) {
        navigate(profile?.role === 'owner' ? '/owner/bookings' : '/student/bookings')
      }
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  async function markAllRead() {
    if (!profile?.uid) return
    setError('')
    setMessage('')
    try {
      await markAllNotificationsRead(profile.uid)
      setItems((current) => current.map((item) => ({ ...item, isRead: true })))
      setMessage('All notifications marked as read.')
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    }
  }

  async function loadMore() {
    if (!profile?.uid || !cursor) return
    setLoadingMore(true)
    setError('')
    try {
      const page = await getNotificationHistory(profile.uid, 20, cursor)
      setItems((current) => [...current, ...page.items])
      setCursor(page.cursor)
      setHasMore(page.items.length === 20)
    } catch (issue) {
      setError(getFirebaseErrorMessage(issue))
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) return <Spinner label="Loading notifications" />

  return (
    <>
      <PageTitle
        eyebrow={`${profile?.role === 'owner' ? 'Owner' : 'Student'} workspace`}
        title="Notifications"
        description="Stay updated on booking requests and decisions."
        action={
          items.some((item) => !item.isRead)
            ? <button type="button" onClick={() => void markAllRead()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><CheckCheck size={16} /> Mark all as read</button>
            : undefined
        }
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Bell className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3 text-lg font-bold text-slate-900">No notifications</h2>
          <p className="mt-2 text-sm text-slate-500">Booking updates will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void openNotification(notification)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${notification.isRead ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'}`}
            >
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${notification.isRead ? 'bg-slate-300' : 'bg-blue-600'}`} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-bold text-slate-900">{notification.title}</span>
                  <span className="text-xs text-slate-500">{relativeTime(notification)}</span>
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{notification.message}</span>
              </span>
            </button>
          ))}
          {hasMore && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="mx-auto mt-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">{loadingMore ? 'Loading…' : 'Load more'}</button>}
        </div>
      )}
    </>
  )
}
