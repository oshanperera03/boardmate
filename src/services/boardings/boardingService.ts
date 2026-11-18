import { collection, getDocs, query, where, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { BoardingListing } from '../../types/boarding'

function toBoardingListing(id: string, data: DocumentData): BoardingListing {
  const requiredStrings = ['name', 'description', 'address', 'city', 'district', 'roomType', 'contactPhone'] as const
  for (const field of requiredStrings) {
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      throw new Error(`Boarding listing "${id}" has an invalid ${field}.`)
    }
  }

  if (!Number.isFinite(data.monthlyRent) || data.monthlyRent < 0) {
    throw new Error(`Boarding listing "${id}" has an invalid monthlyRent.`)
  }
  if (!Number.isInteger(data.availableRooms) || data.availableRooms < 0) {
    throw new Error(`Boarding listing "${id}" has an invalid availableRooms.`)
  }
  if (!['male', 'female', 'any'].includes(data.genderPreference)) {
    throw new Error(`Boarding listing "${id}" has an invalid genderPreference.`)
  }
  if (!Array.isArray(data.facilities) || !data.facilities.every((item) => typeof item === 'string')) {
    throw new Error(`Boarding listing "${id}" has invalid facilities.`)
  }

  return {
    id,
    name: data.name,
    description: data.description,
    address: data.address,
    city: data.city,
    district: data.district,
    monthlyRent: data.monthlyRent,
    roomType: data.roomType,
    availableRooms: data.availableRooms,
    genderPreference: data.genderPreference,
    facilities: data.facilities,
    contactPhone: data.contactPhone,
  }
}

export async function getPublishedBoardings(): Promise<BoardingListing[]> {
  const snapshot = await getDocs(
    query(collection(db, 'boardings'), where('status', '==', 'published')),
  )

  return snapshot.docs
    .map((entry) => toBoardingListing(entry.id, entry.data()))
    .sort((first, second) => first.monthlyRent - second.monthlyRent || first.name.localeCompare(second.name))
}
