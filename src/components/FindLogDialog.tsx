"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique filenames

interface FindLogDialogProps {
  latitude: number | null;
  longitude: number | null;
  onFindLogged: () => void;
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

const FindLogDialog: React.FC<FindLogDialogProps> = ({ latitude, longitude, onFindLogged }) => {
  const [name, setName] = useState(''); // New state for find name
  const [description, setDescription] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteType, setSiteType] = useState<string>('Please Choose');
  const [customSiteType, setCustomSiteType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10); // Limit to 10 files
      setSelectedFiles(e.target.files);
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const uploadImages = async (userId: string) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return [];
    }

    const uploadedImageUrls: string[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`; // Store images in a user-specific folder
      console.log("Find Image Upload Path:", filePath); // Log upload path

      const { data, error } = await supabase.storage
        .from('find-images') // Use your bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading image:', error);
        showError(`Failed to upload image ${file.name}: ${error.message}`);
        continue;
      }

      // Get public URL for the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('find-images')
        .getPublicUrl(filePath);

      if (publicUrlData) {
        console.log("Uploaded Find Image Public URL:", publicUrlData.publicUrl); // Log public URL
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }
    }
    return uploadedImageUrls;
  };

  const handleSaveFind = async () => {
    if (!user) {
      showError('You must be logged in to log a find.');
      return;
    }
    if (latitude === null || longitude === null) {
      showError('Could not get current location. Please try again.');
      return;
    }
    if (!name.trim()) { // Name is now required
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

    setLoading(true);
    try {
      const imageUrls = await uploadImages(user.id);

      const { data, error } = await supabase.from('finds').insert([
        {
          user_id: user.id,
          latitude,
          longitude,
          name: name.trim(), // Save the new name field
          description: description.trim() || null, // Description is optional
          site_name: siteName.trim() || null,
          site_type: siteType === 'Other' ? customSiteType.trim() : siteType,
          image_urls: imageUrls,
        },
      ]).select();

      if (error) throw error;

      showSuccess('Find logged successfully!');
      setName(''); // Clear name
      setDescription('');
      setSiteName('');
      setSiteType('Please Choose');
      setCustomSiteType('');
      setSelectedFiles(null);
      setImagePreviews([]);
      onFindLogged();
      setIsOpen(false);
    } catch (error: any) {
      showError(`Error logging find: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Log New Find</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] z-[1000] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Find</DialogTitle>
          <DialogDescription>
            Record details about your metal detecting find.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="latitude" className="text-right">
              Latitude
            </Label>
            <Input id="latitude" value={latitude?.toFixed(6) || ''} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="longitude" className="text-right">
              Longitude
            </Label>
            <Input id="longitude" value={longitude?.toFixed(6) || ''} readOnly className="col-span-3" />
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
              placeholder="Add more details about your find..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="images" className="text-right">
              Images (max 10)
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
            <div className="col-span-4 flex flex-wrap gap-2 mt-2 justify-center">
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt={`Preview ${index + 1}`} className="w-full h-16 object-cover rounded-md" />
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSaveFind} disabled={loading}>
            {loading ? 'Saving...' : 'Save Find'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FindLogDialog;