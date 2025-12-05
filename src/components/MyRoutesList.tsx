"use client";

import React, { useState } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added CardHeader, CardTitle
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import RouteDetailsModal from './RouteDetailsModal'; // Import the new modal
import EditRouteDialog from './EditRouteDialog'; // Import the new dialog
import { RefreshCw } from 'lucide-react'; // Import refresh icon

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
  images: string[] | null; // Added images field (these will be signed URLs)
  created_at: string;
}

interface MyRoutesListProps {
  isLoading: boolean;
  routes: Route[];
  onRouteUpdated: () => void; // New prop to trigger refetch
}

const MyRoutesList: React.FC<MyRoutesListProps> = ({ isLoading, routes, onRouteUpdated }) => {
  const [isRouteDetailsModalOpen, setIsRouteDetailsModalOpen] = useState(false);
  const [selectedRouteForDetails, setSelectedRouteForDetails] = useState<Route | null>(null);
  const [isEditRouteDialogOpen, setIsEditRouteDialogOpen] = useState(false);
  const [selectedRouteToEdit, setSelectedRouteToEdit] = useState<Route | null>(null);

  const handleRouteNameClick = (route: Route) => {
    setSelectedRouteForDetails(route);
    setIsRouteDetailsModalOpen(true);
  };

  const handleEditClick = (route: Route) => {
    setSelectedRouteToEdit(route);
    setIsEditRouteDialogOpen(true);
  };

  const handleRouteEditedOrDeleted = () => {
    onRouteUpdated(); // Trigger refetch in parent
    setIsRouteDetailsModalOpen(false); // Close details modal if open
    setIsEditRouteDialogOpen(false); // Close edit dialog if open
  };

  const handleRefreshClick = () => {
    onRouteUpdated(); // Trigger refetch in parent
  };

  if (isLoading) {
    return (
      <CardContent className="flex items-center justify-center flex-grow p-4">
        <p className="text-gray-600 dark:text-gray-400">Loading your routes...</p>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-end space-y-0 p-4 pt-0"> {/* Added CardHeader for refresh button */}
        <Button variant="ghost" size="icon" onClick={handleRefreshClick} disabled={isLoading}>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh Routes</span>
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        {routes.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 p-4">No routes tracked yet. Start tracking to record your first route!</p>
        ) : (
          <ScrollArea className="h-[400px] lg:h-[calc(100vh-450px)]">
            <div className="p-4">
              {routes.map((route, index) => (
                <React.Fragment key={route.id}>
                  <div className="mb-4 flex items-center gap-4">
                    {/* Display first image as thumbnail if available */}
                    {route.images && route.images.length > 0 && (
                      <img
                        src={route.images[0]}
                        alt="Route thumbnail"
                        className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <div className="flex-grow">
                      <button onClick={() => handleRouteNameClick(route)} className="text-left w-full">
                        <p className="font-semibold text-lg hover:underline cursor-pointer">
                          {route.name || `Route ${index + 1}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Logged: {new Date(route.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          Distance: {route.distance_km.toFixed(2)} km
                        </p>
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(route)} className="flex-shrink-0">
                      Edit
                    </Button>
                  </div>
                  {index < routes.length - 1 && <Separator className="my-4" />}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        )}

      {selectedRouteForDetails && (
        <RouteDetailsModal
          isOpen={isRouteDetailsModalOpen}
          onOpenChange={setIsRouteDetailsModalOpen}
          route={selectedRouteForDetails}
          onRouteUpdated={handleRouteEditedOrDeleted}
        />
      )}

      {selectedRouteToEdit && (
        <EditRouteDialog
          isOpen={isEditRouteDialogOpen}
          onOpenChange={setIsEditRouteDialogOpen}
          route={selectedRouteToEdit}
          onRouteUpdated={handleRouteEditedOrDeleted}
        />
      )}
    </CardContent>
    </>
  );
};

export default MyRoutesList;