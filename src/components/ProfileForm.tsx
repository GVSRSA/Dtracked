import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';

interface ProfileFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ isOpen, onOpenChange, onProfileUpdated }) => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      fetchProfile();
    }
  }, [user, isOpen]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id); // Re-added .eq('id', user.id)

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      // If data is an array, take the first element. If no data, it's null.
      if (data && data.length > 0) {
        setFirstName(data[0].first_name || '');
        setLastName(data[0].last_name || '');
        setAvatarUrl(data[0].avatar_url || null);
      } else {
        // If no profile exists, initialize with empty values
        setFirstName('');
        setLastName('');
        setAvatarUrl(null);
      }
    } catch (error: any) {
      showError(`Error fetching profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file)); // Show immediate preview
    }
  };

  const uploadAvatar = async (userId: string, file: File) => {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `avatars/${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars') // Assuming you'll create an 'avatars' bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite existing avatar if any
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!user) {
      showError('You must be logged in to update your profile.');
      return;
    }

    setLoading(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (selectedAvatarFile) {
        newAvatarUrl = await uploadAvatar(user.id, selectedAvatarFile);
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            avatar_url: newAvatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      showSuccess('Profile updated successfully!');
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      showError(`Error updating profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] z-[1000]"> {/* Increased z-index */}
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="User Avatar" />
              ) : (
                <AvatarFallback>
                  <UserIcon className="h-12 w-12 text-gray-500" />
                </AvatarFallback>
              )}
            </Avatar>
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="col-span-3 w-full max-w-xs"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" value={user?.email || ''} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              First Name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">
              Last Name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSaveProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileForm;