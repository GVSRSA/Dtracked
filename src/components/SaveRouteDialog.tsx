"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showError, showSuccess } from '@/utils/toast';
import { XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { captureMapImage, base64ToFile } from '@/utils/mapCapture';

interface SaveRouteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string, imageUrls: string[], routeMapImageUrl: string | null) => void;
  distance: number;
}

const SaveRouteDialog: React.FC<SaveRouteDialogProps> = ({ isOpen, onOpenChange, onSave, distance }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [routeMapImage, setRouteMapImage] = useState<string | null>(null);
  const [routeMapPreview, setRouteMapPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSelectedFiles([]);
      setImagePreviews([]);
      setRouteMapImage(null);
      setRouteMapPreview(null);
      setLoading(false);
      
      // Capture the map image when dialog opens
      captureMapImage('map-container').then((base64Image) => {
        setRouteMapImage(base64Image);
        setRouteMapPreview(base64Image);
      }).catch((error) => {
        console.error('Failed to capture map image:', error);
        showError('Could not capture route map image');
      });
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const currentTotalImages = (routeMapImage ? 1 : 0) + selectedFiles.length;
      const filesToAdd = Array.from(e.target.files).slice(0, 5 - currentTotalImages); // Limit new files based on total limit
      
      if (filesToAdd.length < e.target.files.length) {
        showError(`You can only upload up to 5 images in total. ${5 - currentTotalImages} slots remaining.`);
      }

      setSelectedFiles(prevFiles => [...prevFiles, ...filesToAdd]);
      const previews = filesToAdd.map(file => URL.createObjectURL(file));
      setImagePreviews(prevPreviews => [...prevPreviews, ...previews]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveRouteMapImage = () => {
    setRouteMapImage(null);
    setRouteMapPreview(null);
  };

  const uploadImages = async (userId: string) => {
    const allFiles: File[] = [];
    
    // Add route map image if available
    if (routeMapImage) {
      const routeMapFile = base64ToFile(routeMapImage, `route-map-${Date.now()}.png`);
      allFiles.push(routeMapFile);
    }
    
    // Add selected files
    allFiles.push(...selectedFiles);

    if (allFiles.length === 0) {
      return [];
    }

    const uploadedImageUrls: string[] = [];
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('route-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading image:', error);
        showError(`Failed to upload image ${file.name}: ${error.message}`);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('route-images')
        .getPublicUrl(filePath);

      if (publicUrlData) {
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }
    }
    return uploadedImageUrls;
  };

  const handleSave = async () => {
    if (!user) {
      showError('You must be logged in to save a route.');
      return;
    }
    if (!name.trim()) {
      showError('Please provide a name for your route.');
      return;
    }

    setLoading(true);
    try {
      const imageUrls = await uploadImages(user.id);
      
      // The first image is the route map image (if it exists)
      const routeMapImageUrl = routeMapImage ? imageUrls[0] : null;
      const additionalImageUrls = routeMapImage ? imageUrls.slice(1) : imageUrls;
      
      await onSave(name.trim(), description.trim(), additionalImageUrls, routeMapImageUrl);
    } catch (error) {
      // Error handled by onSave in Dashboard
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] z-[1000] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Your Route</DialogTitle>
          <DialogDescription>
            Give your tracked route a name and description before saving. A map image of your route will be automatically captured.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="routeName" className="text-right">
              Route Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="routeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Morning Walk, Forest Trail"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="routeDescription" className="text-right">
              Description (Optional)
            </Label>
            <Textarea
              id="routeDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Add details about your route..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Distance
            </Label>
            <Input value={`${distance.toFixed(2)} km`} readOnly className="col-span-3" />
          </div>

          {/* Route Map Image */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Route Map Image
            </Label>
            <div className="col-span-3">
              {routeMapPreview ? (
                <div className="relative w-full max-w-xs">
                  <img src={routeMapPreview} alt="Route Map" className="w-full h-32 object-cover rounded-md border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveRouteMapImage}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">Automatically captured route map</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Capturing route map...</p>
              )}
            </div>
          </div>

          {/* Additional Images */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="images" className="text-right">
              Additional Images (max {5 - (routeMapImage ? 1 : 0)})
            </Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="col-span-3"
              disabled={(routeMapImage ? 1 : 0) + selectedFiles.length >= 5}
            />
          </div>
          {imagePreviews.length > 0 && (
            <div className="col-span-4 flex flex-wrap gap-2 mt-2 justify-center">
              {imagePreviews.map((src, index) => (
                <div key={index} className="relative w-20 h-16">
                  <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Route'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveRouteDialog;