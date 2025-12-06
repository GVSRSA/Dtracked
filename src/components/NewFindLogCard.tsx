"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { uploadImagesToStorage, getPublicUrlsForImages } from '@/utils/supabaseStorage';
import { XCircle } from 'lucide-react'; // Removed Chevron icons as collapsible is moved out
import { CardContent } from '@/components/ui/card'; // Keep CardContent for styling

interface NewFindLogCardProps {
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

const NewFindLogCard: React.FC<NewFindLogCardProps> = ({ latitude, longitude, onFindLogged }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteType, setSiteType] = useState<string>('Please Choose');
  const [customSiteType, setCustomSiteType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const resetForm = () => {
    setName('');
    setDescription('');
    setSiteName('');
    setSiteType('Please Choose');
    setCustomSiteType('');
    setSelectedFiles([]);
    setImagePreviews([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 10); // Limit to 10 files
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

    try {
      // Upload images and get file paths
      const uploadedImagePaths = await uploadImagesToStorage(selectedFiles, userId, 'find-images');
      
      // Get public URLs for the uploaded images
      const publicUrls = await getPublicUrlsForImages(uploadedImagePaths, 'find-images');
      
      return publicUrls;
    } catch (error: any) {
      console.error('Error uploading images:', error);
      showError(`Failed to upload images: ${error.message}`);
      return [];
    }
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

    setLoading(true);
    try {
      const imageUrls = await uploadImages(user.id);

      const { data, error } = await supabase.from('finds').insert([
        {
          user_id: user.id,
          latitude,
          longitude,
          name: name.trim(),
          description: description.trim() || null,
          site_name: siteName.trim() || null,
          site_type: siteType === 'Other' ? customSiteType.trim() : siteType,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        },
      ]).select();

      if (error) throw error;

      showSuccess('Find logged successfully!');
      resetForm();
      onFindLogged();
    } catch (error: any) {
      showError(`Error logging find: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CardContent className="p-4 grid gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Your current location: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" value={latitude?.toFixed(6) || ''} readOnly />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" value={longitude?.toFixed(6) || ''} readOnly />
        </div>
      </div>
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="name">Find Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Roman Coin, Old Button"
          required
        />
      </div>
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="siteName">Site Name</Label>
        <Input
          id="siteName"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="e.g., Old Farm Field"
        />
      </div>
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="siteType">Site Type <span className="text-red-500">*</span></Label>
        <Select value={siteType} onValueChange={setSiteType}>
          <SelectTrigger id="siteType">
            <SelectValue placeholder="Select a site type" />
          </SelectTrigger>
          <SelectContent position="popper">
            {siteTypeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {siteType === 'Other' && (
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="customSiteType">Other Type Details <span className="text-red-500">*</span></Label>
          <Textarea
            id="customSiteType"
            value={customSiteType}
            onChange={(e) => setCustomSiteType(e.target.value)}
            placeholder="Describe your custom site type..."
            required
          />
        </div>
      )}
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details about your find..."
        />
      </div>
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="images">Images (max 10)</Label>
        <Input
          id="images"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
      {imagePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
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
      <Button type="submit" onClick={handleSaveFind} disabled={loading} className="w-full mt-4">
        {loading ? 'Saving...' : 'Save Find'}
      </Button>
    </CardContent>
  );
};

export default NewFindLogCard;