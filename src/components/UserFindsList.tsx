import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import EditFindDialog from './EditFindDialog';
import FindDetailsModal from './FindDetailsModal'; // Import the new modal

interface Find {
  id: string;
  user_id: string;
  name: string | null; // Added new field
  latitude: number;
  longitude: number;
  description: string | null;
  image_urls: string[] | null;
  created_at: string;
  site_name: string | null;
  site_type: string | null;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface UserFindsListProps {
  finds: Find[];
  isLoading: boolean;
  onFindUpdated: () => void;
  userProfile: Profile | null; // Pass the current user's profile
}

const UserFindsList: React.FC<UserFindsListProps> = ({ finds, isLoading, onFindUpdated, userProfile }) => {
  const [isEditFindDialogOpen, setIsEditFindDialogOpen] = useState(false);
  const [selectedFindToEdit, setSelectedFindToEdit] = useState<Find | null>(null);
  const [isFindDetailsModalOpen, setIsFindDetailsModalOpen] = useState(false);
  const [selectedFindForDetails, setSelectedFindForDetails] = useState<Find | null>(null);

  const handleEditClick = (find: Find) => {
    setSelectedFindToEdit(find);
    setIsEditFindDialogOpen(true);
  };

  const handleFindNameClick = (find: Find) => {
    setSelectedFindForDetails(find);
    setIsFindDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Your Finds</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-80px)]">
          <p className="text-gray-600 dark:text-gray-400">Loading your finds...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Your Finds</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        {finds.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 p-4">No finds logged yet. Start tracking and log your first discovery!</p>
        ) : (
          <ScrollArea className="h-[400px] lg:h-[calc(100vh-450px)]">
            <div className="p-4">
              {finds.map((find, index) => (
                <React.Fragment key={find.id}>
                  <div className="mb-4 flex items-center gap-4">
                    {find.image_urls && find.image_urls.length > 0 && (
                      <img
                        src={find.image_urls[0]} // First image as thumbnail
                        alt="Find thumbnail"
                        className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <div className="flex-grow">
                      <button onClick={() => handleFindNameClick(find)} className="text-left w-full">
                        <p className="font-semibold text-lg hover:underline cursor-pointer">
                          {find.name || find.description || 'Untitled Find'} {/* Display name, fallback to description */}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Logged: {new Date(find.created_at).toLocaleString()}
                        </p>
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(find)} className="flex-shrink-0">
                      Edit
                    </Button>
                  </div>
                  {index < finds.length - 1 && <Separator className="my-2" />}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {selectedFindToEdit && (
        <EditFindDialog
          isOpen={isEditFindDialogOpen}
          onOpenChange={setIsEditFindDialogOpen}
          find={selectedFindToEdit}
          onFindUpdated={onFindUpdated}
        />
      )}
      {selectedFindForDetails && (
        <FindDetailsModal
          isOpen={isFindDetailsModalOpen}
          onOpenChange={setIsFindDetailsModalOpen}
          find={selectedFindForDetails}
          finderProfile={userProfile}
        />
      )}
    </Card>
  );
};

export default UserFindsList;