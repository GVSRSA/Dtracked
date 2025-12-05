"use client";

import React, { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Keep CardContent for styling, add CardHeader, CardTitle
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import EditFindDialog from './EditFindDialog';
import FindDetailsModal from './FindDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { showError } from '@/utils/toast';
import { getSignedUrlsForImages } from '@/utils/supabaseStorage'; // Import the new utility
import { RefreshCw } from 'lucide-react'; // Import refresh icon

interface Find {
  id: string;
  user_id: string;
  name: string | null;
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

interface UserFindsPaginatedListProps {
  userId: string;
  userProfile: Profile | null;
  onMapRefresh: () => void; // New prop for refreshing the map
}

const ITEMS_PER_PAGE = 5; // Number of finds to display per page

const UserFindsPaginatedList: React.FC<UserFindsPaginatedListProps> = ({ userId, userProfile, onMapRefresh }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditFindDialogOpen, setIsEditFindDialogOpen] = useState(false);
  const [selectedFindToEdit, setSelectedFindToEdit] = useState<Find | null>(null);
  const [isFindDetailsModalOpen, setIsFindDetailsModalOpen] = useState(false);
  const [selectedFindForDetails, setSelectedFindForDetails] = useState<Find | null>(null);

  const { data, isLoading, refetch } = useQuery<{ finds: Find[]; count: number }>({
    queryKey: ['userFindsPaginated', userId, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: findsData, error, count } = await supabase
        .from('finds')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        showError(`Error fetching finds: ${error.message}`);
        throw error;
      }

      // Generate signed URLs for images using the utility function
      const findsWithSignedUrls = await Promise.all(
        (findsData || []).map(async (find) => {
          const signedImageObjects = await getSignedUrlsForImages(find.image_urls, 'find-images');
          return {
            ...find,
            image_urls: signedImageObjects ? signedImageObjects.map(obj => obj.signedUrl) : null,
          };
        })
      );

      return { finds: findsWithSignedUrls, count: count || 0 };
    },
    enabled: !!userId,
  });

  const finds = data?.finds || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleEditClick = (find: Find) => {
    setSelectedFindToEdit(find);
    setIsEditFindDialogOpen(true);
  };

  const handleFindNameClick = (find: Find) => {
    setSelectedFindForDetails(find);
    setIsFindDetailsModalOpen(true);
  };

  const handleFindUpdated = () => {
    refetch(); // Refetch finds for the paginated list
    onMapRefresh(); // Also refresh the map
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRefreshClick = () => {
    refetch();
    onMapRefresh(); // Refresh map on manual list refresh too
  };

  if (isLoading) {
    return (
      <CardContent className="flex items-center justify-center flex-grow p-4">
        <p className="text-gray-600 dark:text-gray-400">Loading your finds...</p>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-end space-y-0 p-4 pt-0"> {/* Added CardHeader for refresh button */}
        <Button variant="ghost" size="icon" onClick={handleRefreshClick} disabled={isLoading}>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh Finds</span>
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        {finds.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 p-4">No finds logged yet. Start tracking and log your first discovery!</p>
        ) : (
          <>
            <ScrollArea className="h-[400px]"> {/* Fixed height for scroll area */}
              <div className="p-4">
                {finds.map((find, index) => (
                  <React.Fragment key={find.id}>
                    <div className="mb-4 flex items-center gap-4">
                      {find.image_urls && find.image_urls.length > 0 && (
                        <>
                          {/* Use the signed URL directly */}
                          <img
                            src={find.image_urls[0]} // First image as thumbnail (now a signed URL)
                            alt="Find thumbnail"
                            className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                          />
                        </>
                      )}
                      <div className="flex-grow">
                        <button onClick={() => handleFindNameClick(find)} className="text-left w-full">
                          <p className="font-semibold text-lg hover:underline cursor-pointer">
                            {find.name || find.description || 'Untitled Find'}
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
            {totalPages > 1 && (
              <Pagination className="mt-4 mb-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink isActive={page === currentPage} onClick={() => handlePageChange(page)}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
        {selectedFindToEdit && (
          <EditFindDialog
            isOpen={isEditFindDialogOpen}
            onOpenChange={setIsEditFindDialogOpen}
            find={selectedFindToEdit}
            onFindUpdated={handleFindUpdated}
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
      </CardContent>
    </>
  );
};

export default UserFindsPaginatedList;