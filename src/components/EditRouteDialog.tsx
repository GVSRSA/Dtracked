"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getSignedUrlsForImages } from '@/utils/supabaseStorage'; // Import the new utility

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
  images: string[] | null; // These are original public URLs from DB
  created_at: string;
}

interface EditRouteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  onRouteUpdated: () => void; // Callback to refresh the list
}

const EditRouteDialog: React.FC<EditRouteDialogProps> = ({ isOpen, onOpenChange, route, onRouteUpdated }) => {
  const { user } = useAuth();
  const [name, setName] = useState(route.name || '');
  const [description, setDescription] = useState(route.description || '');
  
  // State to hold { originalPath, signedUrl } for existing images
  const [existingImages, setExistingImages] = useState<{ originalPath: string; signedUrl: string }[]>([]);
  // State to hold File objects for newly selected images
  const [newSelectedFiles, setNewSelectedFiles] = useState<File[]>([]);
  // State to hold object URLs for new image previews
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      if (isOpen && route.images && route.images.length > 0) {
        const signedImageObjects = await getSignedUrlsForImages(route.images, 'route-images');
        setExistingImages(signedImageObjects || []);
      } else if (isOpen) {
        setExistingImages([]);
      }
    };

    if (isOpen) {
      setName(route.name || '');
      setDescription(route.description || '');
      setExistingImages([]); // Clear existing images before loading
      setNewSelectedFiles([]);
      setNewImagePreviews([]);
      setLoading(false);
      setIsAlertDialogOpen(false);
      loadImages(); // Load signed URLs for existing images
    }
  }, [isOpen, route]);

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const currentTotalImages = existingImages.length + newSelectedFiles.length;
      const filesToAdd = Array.from(e.target.files).slice(0, 5 - currentTotalImages); // Limit new files based on total limit
      
      if (filesToAdd.length < e.target.files.length) {
        showError(`You can only upload up to 5 images in total. ${5 - currentTotalImages} slots remaining.`);
      }

      setNewSelectedFiles(prevFiles => [...prevFiles, ...filesToAdd]);
      const previews = filesToAdd.map(file => URL.createObjectURL(file));
      setNewImagePreviews(prevPreviews => [...prevPreviews, ...previews]);
    }
  };

  const handleRemoveExistingImage = (signedUrlToRemove: string) => {
    setExistingImages(prevImages => prevImages.filter(img => img.signedUrl !== signedUrlToRemove));
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setNewSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setNewImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
  };

  const uploadNewImages = async (userId: string) => {
    if (newSelectedFiles.length === 0) {
      return [];
    }

    const uploadedImagePaths: string[] = [];
    for (let i = 0; i < newSelectedFiles.length; i++) {
      const file = newSelectedFiles[i];
      const fileExtension = file.name.split('.').pop();
      const filePath = `${userId}/${uuidv4()}.${fileExtension}`; // Store images in a user-specific folder

      const { error } = await supabase.storage
        .from('route-images') // Use your bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading new image:', error);
        showError(`Failed to upload image ${file.name}: ${error.message}`);
        continue;
      }
      uploadedImagePaths.push(filePath); // Store the path within the bucket
    }
    return uploadedImagePaths;
  };

  const handleSaveRoute = async () => {
    if (!user) {
      showError('You must be logged in to update a route.');
      return;
    }
    if (!name.trim()) {
      showError('Please provide a name for your route.');
      return;
    }
    if (existingImages.length + newSelectedFiles.length > 5) {
      showError('You can only save up to 5 images per route.');
      return;
    }

    setLoading(true);
    try {
      const uploadedNewImagePaths = await uploadNewImages(user.id);
      
      // Get the original paths of the images that are still "kept"
      const keptOriginalImagePaths = existingImages.map(img => img.originalPath);

      const combinedImagePaths = [...keptOriginalImagePaths, ...uploadedNewImagePaths];

      const { error } = await supabase
        .from('routes')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          images: combinedImagePaths.length > 0 ? combinedImagePaths : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', route.id);

      if (error) throw error;

      showSuccess('Route updated successfully!');
      onRouteUpdated();
      onOpenChange(false);
    } catch (error: any) {
      showError(`Error updating route: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!user) {
      showError('You must be logged in to delete a route.');
      setIsAlertDialogOpen(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', route.id);

      if (error) throw error;

      showSuccess('Route deleted successfully!');
      onRouteUpdated();
      onOpenChange(false); // Close edit dialog
    } catch (error: any) {
      showError(`Error deleting route: ${error.message}`);
    } finally {
      setLoading(false);
      setIsAlertDialogOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] z-[1001] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Route</DialogTitle>
          <DialogDescription>
            Modify the details of your tracked route.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
            <Input value={`${route.distance_km.toFixed(2)} km`} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Start
            </Label>
            <Input value={`Lat ${route.start_latitude.toFixed(6)}, Lng ${route.start_longitude.toFixed(6)}`} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              End
            </Label>
            <Input value={`Lat ${route.end_latitude.toFixed(6)}, Lng ${route.end_longitude.toFixed(6)}`} readOnly className="col-span-3" />
          </div>
        </div>

        {/* Existing Images section */}
        <div className="px-4 pb-4">
          <Label className="block text-left mb-2">
            Existing Images
          </Label>
          <div className="flex flex-wrap gap-2 justify-center">
            {existingImages && existingImages.length > 0 ? (
              existingImages.map((img, idx) => (
                <div key={img.originalPath} className="relative w-20 h-16">
                  <img src={img.signedUrl} alt={`Existing ${idx + 1}`} className="w-full h-full object-cover rounded-md" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => handleRemoveExistingImage(img.signedUrl)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center w-full">No existing images.</p>
            )}
          </div>
        </div>

        {/* Add New Images section */}
        <div className="px-4 pb-4">
          <Label htmlFor="newImages" className="block text-left mb-2">
            Add New Images (max {5 - existingImages.length - newSelectedFiles.length} remaining)
          </Label>
          <Input
            id="newImages"
            type="file"
            multiple
            accept="image/*"
            onChange={handleNewFileChange}
            className="w-full"
            disabled={existingImages.length + newSelectedFiles.length >= 5}
          />
          {newImagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center"> {/* Removed col-span-4 as parent is now flex */}
              {newImagePreviews.map((src, index) => (
                <div key={index} className="relative w-20 h-16">
                  <img src={src} alt={`New Preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => handleRemoveNewImage(index)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                Delete Route
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-[1002]">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your route record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRoute} className="bg-red-600 hover:bg-red-700" disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="submit" onClick={handleSaveRoute} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRouteDialog;