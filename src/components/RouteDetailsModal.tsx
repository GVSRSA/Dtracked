"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import EditRouteDialog from './EditRouteDialog';
import { MapPin, Route as RouteIcon, CalendarDays, Ruler } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent as ShadcnCardContent } from '@/components/ui/card'; // Renamed to avoid conflict

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

interface RouteDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  onRouteUpdated: () => void; // Callback to refresh the list
}

const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({ isOpen, onOpenChange, route, onRouteUpdated }) => {
  const [isEditRouteDialogOpen, setIsEditRouteDialogOpen] = useState(false);

  const handleEditClick = () => {
    setIsEditRouteDialogOpen(true);
  };

  const handleRouteEditedOrDeleted = () => {
    onRouteUpdated(); // Refresh the list
    onOpenChange(false); // Close the details modal after edit/delete
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] z-[1000] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{route.name || 'Untitled Route'}</DialogTitle>
            <DialogDescription>
              Details of your tracked route.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <RouteIcon className="h-4 w-4 text-muted-foreground" />
              <strong>Name:</strong> {route.name || 'N/A'}
            </div>
            {route.description && (
              <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="pt-1"><CalendarDays className="h-4 w-4 text-muted-foreground" /></span>
                <strong>Description:</strong> {route.description}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <strong>Logged:</strong> {new Date(route.created_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <strong>Distance:</strong> {route.distance_km.toFixed(2)} km
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <strong>Start Location:</strong> Lat {route.start_latitude.toFixed(6)}, Lng {route.start_longitude.toFixed(6)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <strong>End Location:</strong> Lat {route.end_latitude.toFixed(6)}, Lng {route.end_longitude.toFixed(6)}
            </div>

            {route.images && route.images.length > 0 ? (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Images</h3>
                <Carousel className="w-full max-w-xs mx-auto">
                  <CarouselContent>
                    {route.images.map((url, index) => {
                      console.log("Route Image URL:", url); // Added console log
                      return (
                        <CarouselItem key={index}>
                          <div className="p-1">
                            <Card>
                              <ShadcnCardContent className="flex aspect-square items-center justify-center p-6">
                                <img src={url} alt={`Route image ${index + 1}`} className="max-w-full max-h-full object-contain" />
                              </ShadcnCardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No images available for this route.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleEditClick}>
              Edit Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isEditRouteDialogOpen && (
        <EditRouteDialog
          isOpen={isEditRouteDialogOpen}
          onOpenChange={setIsEditRouteDialogOpen}
          route={route}
          onRouteUpdated={handleRouteEditedOrDeleted}
        />
      )}
    </>
  );
};

export default RouteDetailsModal;