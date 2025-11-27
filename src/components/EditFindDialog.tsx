"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { XCircle } from 'lucide-react'; // Icon for removing images
import { getSignedUrlsForImages } from '@/utils/supabaseStorage'; // Import the new utility

interface Find {
  id: string;
  user_id: string;
  name: string | null; // Added new field
  latitude: number;
  longitude: number;
  description: string | null;
  image_urls: string[] | null; // These are original public URLs from DB
  created_at: string;
  site_name: string | null;
  site_type: string | null;
}

interface EditFindDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  find: Find;
  onFindUpdated: () => void;
}

const siteTypeOptions = [
  'Please Choose',
  'Home',
  'Sports field',
  'Beach',
  'Event Facility',
  'Public Ground',
  'Unknown Heritage Site',
  'Known Heritage Site',
  'Other',
];

const EditFindDialog: React.FC<EditFindDialogProps> = ({ isOpen, onOpenChange, find, onFindUpdated }) => {
  const [name, setName] = useState(find.name || '');
  const [description, setDescription] = useState(find.description || '');
  const [siteName, setSiteName] = useState(find.site_name || '');
  const [siteType, setSiteType] = useState<string>(find.site_type || 'Please Choose');
  const [customSiteType, setCustomSiteType] = useState('');
  
  // State to hold { originalPath, signedUrl } for existing images
  const [existingImages, setExistingImages] = useState<{ originalPath: string; signedUrl: string }[]>([]);
  // State to hold File objects for newly selected images
  const [newSelectedFiles, setNewSelectedFiles] = useState<File[]>([]);
  // State to hold object URLs for new image previews
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadImages = async () => {
      if (isOpen && find.image_urls && find.image_urls.length > 0) {
        const signedImageObjects = await getSignedUrlsForImages(find.image_urls, 'find-images');
        setExistingImages(signedImageObjects || []);
      } else if (isOpen) {
        setExistingImages([]);
      }
    };

    if (isOpen) {
      setName(find.name || '');
      setDescription(find.description || '');
      setSiteName(find.site_name || '');
      if (find.site_type && siteTypeOptions.includes(find.site_type)) {
        setSiteType(find.site_type);
        setCustomSiteType('');
      } else if (find.site_type) {
        setSiteType('Other');
        setCustomSiteType(find.site_type);
      } else {
        setSiteType('Please Choose');
        setCustomSiteType('');
      }
      setNewSelectedFiles([]);
      setNewImagePreviews([]);
      setIsAlertDialogOpen(false);
      loadImages(); // Load signed URLs for existing images
    }
  }, [isOpen, find]);

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 10 - existingImages.length); // Limit new files based on total limit
      
      if (filesArray.length < e.target.files.length) {
        showError(`You can only upload up to 10 images in total. ${10 - existingImages.length} slots remaining.`);
      }

      setNewSelectedFiles(prevFiles => [...prevFiles, ...filesArray]);
      const previews = filesArray.map(file => URL.createObjectURL(file));
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
        .from('find-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('EditFindDialog - Error uploading new image:', error);
        showError(`Failed to upload image ${file.name}: ${error.message}`);
        continue;
      }
      uploadedImagePaths.push(filePath); // Store the path within the bucket
    }
    return uploadedImagePaths;
  };

  const handleSaveFind = async () => {
    if (!user) {
      showError('You must be logged in to update a find.');
      return;
    }
    if (!name.trim()) {
      showError('Please provide a name for your find.');
      return;
    }
    if (siteType === 'Please Choose') {
      showError('Please select a Site Type.');
      return;
    }
    if (siteType === 'Other' && !customSiteType.trim()) {
      showError('Please provide details for the Other Site Type.');
      return;
    }
    if (existingImages.length + newSelectedFiles.length > 10) {
      showError('You can only save up to 10 images per find.');
      return;
    }

    setLoading(true);
    try {
      const uploadedNewImagePaths = await uploadNewImages(user.id);
      
      // Get the original paths of the images that are still "kept"
      const keptOriginalImagePaths = existingImages.map(img => img.originalPath);

      const combinedImagePaths = [...keptOriginalImagePaths, ...uploadedNewImagePaths];

      const { error } = await supabase
        .from('finds')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          site_name: siteName.trim() || null,
          site_type: siteType === 'Other' ? customSiteType.trim() : siteType,
          image_urls: combinedImagePaths.length > 0 ? combinedImagePaths : null,
        })
        .eq('id', find.id);

      if (error) throw error;

      showSuccess('Find updated successfully!');
      onFindUpdated();
      onOpenChange(false);
    } catch (error: any) {
      showError(`Error updating find: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFind = async () => {
    if (!user) {
      showError('You must be logged in to delete a find.');
      setIsAlertDialogOpen(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('finds')
        .delete()
        .eq('id', find.id);

      if (error) throw error;

      showSuccess('Find deleted successfully!');
      onFindUpdated();
      onOpenChange(false);
    } catch (error: any) {
      showError(`Error deleting find: ${error.message}`);
    } finally {
      setLoading(false);
      setIsAlertDialogOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] z-[1000] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Find</DialogTitle>
          <DialogDescription>
            Modify the details of your metal detecting find.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="latitude" className="text-right">
              Latitude
            </Label>
            <Input id="latitude" value={find.latitude.toFixed(6)} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="longitude" className="text-right">
              Longitude
            </Label>
            <Input id="longitude" value={find.longitude.toFixed(6)} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Find Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Roman Coin, Old Button"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="siteName" className="text-right">
              Site Name
            </Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Old Farm Field"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="siteType" className="text-right">
              Site Type <span className="text-red-500">*</span>
            </Label>
            <Select value={siteType} onValueChange={setSiteType}>
              <SelectTrigger id="siteType" className="col-span-3">
                <SelectValue placeholder="Select a site type" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]">
                {siteTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {siteType === 'Other' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customSiteType" className="text-right">
                Other Type Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="customSiteType"
                value={customSiteType}
                onChange={(e) => setCustomSiteType(e.target.value)}
                className="col-span-3"
                placeholder="Describe your custom site type..."
                required
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Describe your find..."
            />
          </div>
        </div>

        {/* Existing Images section - moved out of the main grid */}
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

        {/* Add New Images section - moved out of the main grid */}
        <div className="px-4 pb-4">
          <Label htmlFor="newImages" className="block text-left mb-2">
            Add New Images (max {10 - existingImages.length - newSelectedFiles.length} remaining)
          </Label>
          <Input
            id="newImages"
            type="file"
            multiple
            accept="image/*"
            onChange={handleNewFileChange}
            className="w-full"
            disabled={existingImages.length + newSelectedFiles.length >= 10}
          />
          {newImagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
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
                Delete Find
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-[1001]">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your find record and associated images.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFind} className="bg-red-600 hover:bg-red-700" disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="submit" onClick={handleSaveFind} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditFindDialog;