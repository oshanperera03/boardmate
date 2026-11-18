import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { PropertyReview } from '../../types/review'

const reviewsCollection = collection(db, 'reviews')

function toReview(entry: DocumentData, id: string): PropertyReview {
  return { ...(entry as PropertyReview), id }
}

export async function getPropertyReviews(propertyId: string): Promise<PropertyReview[]> {
  const snapshot = await getDocs(query(reviewsCollection, where('propertyId', '==', propertyId)))
  return snapshot.docs
    .map((entry) => toReview(entry.data(), entry.id))
    .sort((first, second) => (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0))
}

export async function savePropertyReview(input: {
  propertyId: string
  bookingId: string
  studentName: string
  rating: number
  comment: string
  existingReview?: PropertyReview
}): Promise<void> {
  const studentId = auth.currentUser?.uid
  if (!studentId) throw new Error('Please sign in again.')
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Choose a rating from 1 to 5 stars.')
  }
  const comment = input.comment.trim()
  if (comment.length < 10 || comment.length > 1000) {
    throw new Error('Your review must be between 10 and 1,000 characters.')
  }
  if (!input.propertyId || !input.bookingId || !input.studentName.trim()) {
    throw new Error('The review details are incomplete.')
  }

  const reviewRef = doc(db, 'reviews', `${input.propertyId}_${studentId}`)
  if (input.existingReview && input.existingReview.id !== reviewRef.id) {
    throw new Error('The review does not belong to this student and property.')
  }
  const review = {
    propertyId: input.propertyId,
    studentId,
    studentName: input.studentName,
    bookingId: input.bookingId,
    rating: input.rating,
    comment,
    updatedAt: serverTimestamp(),
  }

  if (input.existingReview) {
    await updateDoc(reviewRef, {
      studentName: review.studentName,
      bookingId: review.bookingId,
      rating: review.rating,
      comment: review.comment,
      updatedAt: review.updatedAt,
    })
  } else {
    await setDoc(reviewRef, {
      ...review,
      createdAt: serverTimestamp(),
    })
  }
}
