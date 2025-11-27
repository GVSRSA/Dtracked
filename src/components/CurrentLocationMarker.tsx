import React, { useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface CurrentLocationMarkerProps {
  latitude: number | null;
  longitude: number | null;
}

const CurrentLocationMarker: React.FC<CurrentLocationMarkerProps> = ({ latitude, longitude }) => {
  const map = useMap();

  const position: L.LatLngLiteral | null = (latitude !== null && longitude !== null)
    ? { lat: latitude, lng: longitude }
    : null;

  useEffect(() => {
    if (position) {
      console.log("CurrentLocationMarker: Flying to new position:", position);
      map.flyTo(position, 18, { // Fixed zoom level to 18
        animate: true,
        duration: 0.5
      });
    }
  }, [position, map]);

  if (!position) {
    return null;
  }

  return (
    <Marker position={position} icon={redIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
};

export default CurrentLocationMarker;