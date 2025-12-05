import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';

interface Find {
  id: string;
  user_id: string;
  name: string | null; // Added new field
  latitude: number;
  longitude: number;
  description: string | null;
  image_urls: string[] | null; // These will now be signed URLs
  created_at: string;
  site_name: string | null;
  site_type: string | null;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface FindDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  find: Find;
  finderProfile: Profile | null; // Profile of the user who made the find
}

const FindDetailsModal: React.FC<FindDetailsModalProps> = ({ isOpen, onOpenChange, find, finderProfile }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] z-[1000]">
        <DialogHeader>
          <DialogTitle>{find.name || find.description || 'Untitled Find'}</DialogTitle> {/* Display name, fallback to description */}
          <DialogDescription>
            Details of your discovery.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Found by:</strong> {finderProfile?.first_name} {finderProfile?.last_name}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Logged:</strong> {new Date(find.created_at).toLocaleString()}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Location:</strong> Lat: {find.latitude.toFixed(6)}, Lng: {find.longitude.toFixed(6)}
          </p>
          {find.site_name && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Site Name:</strong> {find.site_name}
            </p>
          )}
          {find.site_type && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Site Type:</strong> {find.site_type}
            </p>
          )}
          {find.description && ( // Display description if it exists
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Description:</strong> {find.description}
            </p>
          )}

          {find.image_urls && find.image_urls.length > 0 ? (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Images</h3>
              <Carousel className="w-full max-w-xs mx-auto">
                <CarouselContent>
                  {find.image_urls.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            {/* Use the signed URL directly */}
                            <img src={url} alt={`Find image ${index + 1}`} className="max-w-full max-h-full object-contain" />
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No images available for this find.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FindDetailsModal;