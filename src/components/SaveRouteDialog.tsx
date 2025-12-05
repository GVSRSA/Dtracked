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

interface SaveRouteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string, imageUrls: string[]) => void;
  distance: number;
}

const SaveRouteDialog: React.FC<SaveRouteDialogProps> = ({ isOpen, onOpenChange, onSave, distance }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSelectedFiles([]);
      setImagePreviews([]);
      setLoading(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 5); // Limit to 5 files
      setSelectedFiles(filesArray);
      const previews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
  };

  const uploadImages = async (userId: string) => {
    if (selectedFiles.length === 0) {
      return [];
    }

    const uploadedImageUrls: string[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`; // Store images in a user-specific folder

      const { data, error } = await supabase.storage
        .from('route-images') // Use a new bucket for route images
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
        console.log("Uploaded Route Image Public URL:", publicUrlData.publicUrl); // Added console log
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
      await onSave(name.trim(), description.trim(), imageUrls);
      // onSave will handle closing the dialog and resetting state in Dashboard
    } catch (error) {
      // Error handled by onSave in Dashboard
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] z-[1000] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Your Route</DialogTitle>
          <DialogDescription>
            Give your tracked route a name and description before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4"> {/* Changed to flex-col for better vertical stacking */}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="images" className="text-right">
              Images (max 5)
            </Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="col-span-3"
            />
          </div>
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center"> {/* Removed col-span-4 as parent is now flex */}
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