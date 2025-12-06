import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { showSuccess, showError } from '@/utils/toast';
import CurrentLocationMarker from './CurrentLocationMarker';
import { Button } from '@/components/ui/button';
import { LocateFixed } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Fix for default marker icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface Find {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  description: string | null;
  image_urls: string[] | null;
  created_at: string;
}

interface MapComponentProps {
  finds: Find[];
  pathCoordinates: [number, number][];
  isTracking: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
}

const MapControls: React.FC<{ latitude: number | null; longitude: number | null }> = ({ latitude, longitude }) => {
  const map = useMap();
  const isDisabled = latitude === null || longitude === null;

  const handleRecenter = () => {
    if (latitude !== null && longitude !== null) {
      map.flyTo([latitude, longitude], 18, {
        animate: true,
        duration: 0.5
      });
    }
  };

  return (
    <div className="leaflet-top leaflet-control-recenter z-[1000] p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="leaflet-control leaflet-bar">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRecenter}
              disabled={isDisabled}
              className="h-9 w-9 rounded-md bg-white dark:bg-gray-800 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <LocateFixed className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isDisabled ? "Waiting for location..." : "Back to my location"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

const MapComponent: React.FC<MapComponentProps> = ({ finds, pathCoordinates, isTracking, currentLatitude, currentLongitude }) => {
  const [mapCenter, setMapCenter] = useState<L.LatLngLiteral>({ lat: 0, lng: 0 });
  const [isLocationSet, setIsLocationSet] = useState(false);

  useEffect(() => {
    if (currentLatitude !== null && currentLongitude !== null && !isLocationSet) {
      setMapCenter({ lat: currentLatitude, lng: currentLongitude });
      setIsLocationSet(true);
    }
  }, [currentLatitude, currentLongitude, isLocationSet]);

  // Fallback to a reasonable default if no location is available
  const effectiveCenter: L.LatLngLiteral = isLocationSet ? mapCenter : { lat: 51.505, lng: -0.09 }; // London as fallback

  return (
    <div id="map-container" className="h-full w-full">
      <MapContainer 
        center={effectiveCenter} 
        zoom={18} 
        scrollWheelZoom={true} 
        className="h-full w-full rounded-md"
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite (Esri)">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <CurrentLocationMarker latitude={currentLatitude} longitude={currentLongitude} />
        <MapControls latitude={currentLatitude} longitude={currentLongitude} />
        {isTracking && pathCoordinates.length > 0 && (
          <Polyline positions={pathCoordinates} color="blue" />
        )}
        {finds.map((find) => (
          <Marker key={find.id} position={[find.latitude, find.longitude]}>
            <Popup>
              <strong>Find:</strong> {find.description || 'No description'}
              <br />
              <small>Logged: {new Date(find.created_at).toLocaleString()}</small>
              {find.image_urls && find.image_urls.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {find.image_urls.map((url, idx) => (
                    <img key={idx} src={url} alt={`Find image ${idx + 1}`} className="w-full h-16 object-cover rounded-md" />
                  ))}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;