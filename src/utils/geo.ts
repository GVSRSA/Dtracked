// Haversine formula to calculate distance between two points on a sphere (in kilometers)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in kilometers

  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

export const calculatePathDistance = (pathCoordinates: [number, number][]): number => {
  if (pathCoordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 0; i < pathCoordinates.length - 1; i++) {
    const [lat1, lon1] = pathCoordinates[i];
    const [lat2, lon2] = pathCoordinates[i + 1];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }
  return totalDistance;
};