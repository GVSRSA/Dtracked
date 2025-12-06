"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import MapComponent from '@/components/MapComponent';
import NewFindLogCard from '@/components/NewFindLogCard';
import PathTracker from '@/components/PathTracker';
import SaveRouteDialog from '@/components/SaveRouteDialog';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculatePathDistance } from '@/utils/geo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import UserFindsPaginatedList from '@/components/UserFindsPaginatedList';
import MyRoutesList from '@/components/MyRoutesList';
import { getSignedUrlsForImages } from '@/utils/supabaseStorage';
import { MadeWithDyad } from '@/components/made-with-dyad';

interface Find {
  id: string;
  user_id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  image_urls: string[] | null;
  created_at: string;
  site_name: string | null;
  site_type: string | null;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Route {
  id: string;
  user_id: string;
  name: string | null;
  description: string | null;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  distance_km: number;
  route_path: [number, number][] | null;
  images: string[] | null;
  route_map_image: string | null; // New field for route map image
  created_at: string;
}

const UserDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentLatitude, setCurrentLatitude] = useState<number | null>(null);
  const [currentLongitude, setCurrentLongitude] = useState<number | null>(null);
  const [locationLoading, setLoading] = useState(true);

  // State for path tracking
  const [isTracking, setIsTracking] = useState(false);
  const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);

  const [isSaveRouteDialogOpen, setIsSaveRouteDialogOpen] = useState(false);
  const [routeToSave, setRouteToSave] = useState<{
    startCoords: [number, number];
    endCoords: [number, number];
    path: [number, number][];
    distance: number;
  } | null>(null);

  // Collapsible states for cards
  const [isNewFindLogCardOpen, setIsNewFindLogCardOpen] = useState(false);
  const [isMapAndTrackingCardOpen, setIsMapAndTrackingCardOpen] = useState(true);
  const [isMyRoutesCardOpen, setIsMyRoutesCardOpen] = useState(false);
  const [isMyFindsCardOpen, setIsMyFindsCardOpen] = useState(false);

  // Fetch initial location once on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLatitude(position.coords.latitude);
          setCurrentLongitude(position.coords.longitude);
          showSuccess('Initial location found!');
          setLoading(false);
        },
        (error) => {
          showError(`Failed to get initial location: ${error.message}`);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      );
    } else {
      showError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  }, []);

  // Fetch user profile details for display
  const { data: profile, refetch: refetchProfile } = useQuery<Profile | null>({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id);

      if (error) {
        console.error("Error fetching profiles:", error);
        throw error;
      }
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!user?.id,
  });

  // Fetch finds for the map component (not paginated list)
  const { data: findsForMap, isLoading: isLoadingFindsForMap, refetch: refetchFindsForMap } = useQuery<Find[]>({
    queryKey: ['userFindsForMap', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: findsData, error } = await supabase
        .from('finds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        showError(`Error fetching finds for map: ${error.message}`);
        throw error;
      }
      
      const findsWithSignedUrls = await Promise.all(
        (findsData || []).map(async (find) => {
          const signedImageObjects = await getSignedUrlsForImages(find.image_urls, 'find-images');
          return {
            ...find,
            image_urls: signedImageObjects ? signedImageObjects.map(obj => obj.signedUrl) : null,
          };
        })
      );
      return findsWithSignedUrls;
    },
    enabled: !!user?.id,
  });

  // Fetch user routes
  const { data: routes, isLoading: isLoadingRoutes, refetch: refetchRoutes } = useQuery<Route[]>({
    queryKey: ['userRoutes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: routesData, error } = await supabase
        .from('routes')
        .select('*, images, route_map_image') // Include the new route_map_image field
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        showError(`Error fetching routes: ${error.message}`);
        throw error;
      }

      const routesWithSignedUrls = await Promise.all(
        (routesData || []).map(async (route) => {
          // Get signed URLs for regular images
          const signedImageObjects = await getSignedUrlsForImages(route.images, 'route-images');
          // Get signed URL for route map image
          const routeMapSignedUrl = route.route_map_image 
            ? (await getSignedUrlsForImages([route.route_map_image], 'route-images'))?.[0]?.signedUrl || null
            : null;

          return {
            ...route,
            images: signedImageObjects ? signedImageObjects.map(obj => obj.signedUrl) : null,
            route_map_image: routeMapSignedUrl,
          };
        })
      );
      return routesWithSignedUrls;
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess('Logged out successfully!');
    navigate('/login');
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }

    showSuccess('Starting route tracking...');
    setIsTracking(true);
    setPathCoordinates([]); // Clear path on new session

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPathCoordinates((prevPath) => [...prevPath, [latitude, longitude]]);
        setCurrentLatitude(latitude);
        setCurrentLongitude(longitude);
      },
      (error) => {
        showError(`Geolocation error: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
    setWatchId(id);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
      showSuccess('Route tracking stopped.');

      if (pathCoordinates.length >= 2) {
        const startCoords = pathCoordinates[0];
        const endCoords = pathCoordinates[pathCoordinates.length - 1];
        const totalDistance = calculatePathDistance(pathCoordinates);
        setRouteToSave({ startCoords, endCoords, path: pathCoordinates, distance: totalDistance });
        setIsSaveRouteDialogOpen(true);
      } else {
        showError('Route too short to save.');
      }
    }
  }, [watchId, pathCoordinates, setRouteToSave, setIsSaveRouteDialogOpen]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const handleFindLogged = () => {
    refetchFindsForMap();
  };

  const handleSaveRoute = async (name: string, description: string, imageUrls: string[], routeMapImageUrl: string | null) => {
    if (!user || !routeToSave) {
      showError('Error: Route data missing or user not logged in.');
      return;
    }

    try {
      const { error } = await supabase.from('routes').insert([
        {
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          start_latitude: routeToSave.startCoords[0],
          start_longitude: routeToSave.startCoords[1],
          end_latitude: routeToSave.endCoords[0],
          end_longitude: routeToSave.endCoords[1],
          distance_km: routeToSave.distance,
          route_path: routeToSave.path,
          images: imageUrls.length > 0 ? imageUrls : null,
          route_map_image: routeMapImageUrl, // Save the route map image URL
        },
      ]);

      if (error) throw error;

      showSuccess('Route saved successfully!');
      setIsSaveRouteDialogOpen(false);
      setRouteToSave(null);
      setPathCoordinates([]);
      refetchRoutes();
    } catch (error: any) {
      showError(`Error saving route: ${error.message}`);
    }
  };

  if (authLoading || locationLoading || (currentLatitude === null && currentLongitude === null && !locationLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-400">Loading application and location...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <div className="w-full bg-primary text-primary-foreground p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Dtracked</h1>
        <Button onClick={handleLogout} variant="ghost" className="flex items-center gap-2">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <div className="flex-grow p-4 flex flex-col gap-6">
        {/* New Log a Find Card */}
        <Card className="flex flex-col">
          <Collapsible open={isNewFindLogCardOpen} onOpenChange={setIsNewFindLogCardOpen}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
              <CardTitle>Log a New Find</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isNewFindLogCardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">{isNewFindLogCardOpen ? 'Collapse' : 'Expand'}</span>
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <NewFindLogCard
                latitude={currentLatitude}
                longitude={currentLongitude}
                onFindLogged={handleFindLogged}
              />
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Map & Tracking Card */}
        <Card className="flex flex-col">
          <Collapsible open={isMapAndTrackingCardOpen} onOpenChange={setIsMapAndTrackingCardOpen}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
              <CardTitle>Map & Tracking</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isMapAndTrackingCardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">{isMapAndTrackingCardOpen ? 'Collapse' : 'Expand'}</span>
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="flex-grow p-4 pt-0">
                {isLoadingFindsForMap ? (
                  <div className="flex items-center justify-center flex-grow h-full">Loading finds...</div>
                ) : (
                  <div className="flex flex-col h-[500px]">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Your current location: {currentLatitude?.toFixed(6)}, {currentLongitude?.toFixed(6)}
                    </p>
                    <PathTracker
                      isTracking={isTracking}
                      pathCoordinates={pathCoordinates}
                      onStartTracking={startTracking}
                      onStopTracking={stopTracking}
                    >
                      {(currentPathCoordinates, currentIsTracking) => (
                        <div id="map-container">
                          <MapComponent
                            finds={findsForMap || []}
                            pathCoordinates={currentPathCoordinates}
                            isTracking={currentIsTracking}
                            currentLatitude={currentLatitude}
                            currentLongitude={currentLongitude}
                          />
                        </div>
                      )}
                    </PathTracker>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* My Routes List Card */}
        <Card className="flex flex-col">
          <Collapsible open={isMyRoutesCardOpen} onOpenChange={setIsMyRoutesCardOpen}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
              <CardTitle>My Routes</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isMyRoutesCardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">{isMyRoutesCardOpen ? 'Collapse' : 'Expand'}</span>
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <MyRoutesList routes={routes || []} isLoading={isLoadingRoutes} onRouteUpdated={refetchRoutes} />
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* My Finds Panel with Pagination */}
        {user?.id && (
          <Card className="flex flex-col">
            <Collapsible open={isMyFindsCardOpen} onOpenChange={setIsMyFindsCardOpen}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                <CardTitle>My Finds</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {isMyFindsCardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">{isMyFindsCardOpen ? 'Collapse' : 'Expand'}</span>
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <UserFindsPaginatedList userId={user.id} userProfile={profile} onMapRefresh={refetchFindsForMap} />
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
      </div>

      {routeToSave && (
        <SaveRouteDialog
          isOpen={isSaveRouteDialogOpen}
          onOpenChange={setIsSaveRouteDialogOpen}
          onSave={handleSaveRoute}
          distance={routeToSave.distance}
        />
      )}

      {/* Footer Bar */}
      <div className="w-full bg-primary text-primary-foreground p-4 flex justify-center items-center shadow-md mt-auto">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default UserDashboard;