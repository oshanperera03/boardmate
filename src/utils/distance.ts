export function haversineDistanceKm(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusKm = 6371
  const latitudeDelta = ((secondLatitude - firstLatitude) * Math.PI) / 180
  const longitudeDelta = ((secondLongitude - firstLongitude) * Math.PI) / 180
  const firstLatitudeRadians = (firstLatitude * Math.PI) / 180
  const secondLatitudeRadians = (secondLatitude * Math.PI) / 180
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(firstLatitudeRadians) * Math.cos(secondLatitudeRadians)
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
