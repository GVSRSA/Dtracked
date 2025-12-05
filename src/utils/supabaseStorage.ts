import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to generate signed URLs for a list of image URLs from a specific Supabase bucket.
 * This is necessary when RLS policies prevent direct access to public URLs without authentication.
 * @param imageUrls An array of full public image URLs stored in the database.
 * @param bucketName The name of the Supabase storage bucket (e.g., 'find-images', 'route-images').
 * @returns A promise that resolves to an array of objects { originalPath: string, signedUrl: string }, or null if no images are provided.
 */
export const getSignedUrlsForImages = async (imageUrls: string[] | null, bucketName: string): Promise<{ originalPath: string; signedUrl: string }[] | null> => {
  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }

  const results: { originalPath: string; signedUrl: string }[] = [];

  for (const imageUrl of imageUrls) {
    let pathWithinBucket = '';
    try {
      const url = new URL(imageUrl);
      const pathnameParts = url.pathname.split('/');
      const publicIndex = pathnameParts.indexOf('public');
      const bucketIndex = pathnameParts.indexOf(bucketName, publicIndex + 1);
      
      if (bucketIndex !== -1 && pathnameParts.length > bucketIndex + 1) {
        pathWithinBucket = pathnameParts.slice(bucketIndex + 1).join('/');
      } else {
        // Fallback if URL structure is unexpected, assume it's already the path
        pathWithinBucket = imageUrl;
      }
    } catch (e) {
      // If imageUrl is not a valid URL, assume it's already the path within the bucket
      pathWithinBucket = imageUrl;
    }

    console.log(`[supabaseStorage] Attempting to create signed URL for path: '${pathWithinBucket}' in bucket: '${bucketName}'`); // Added log
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(pathWithinBucket, 60 * 60); // URL valid for 1 hour

    if (signedUrlError) {
      console.error(`[supabaseStorage] Error creating signed URL for image '${pathWithinBucket}' in bucket '${bucketName}':`, signedUrlError);
      results.push({ originalPath: pathWithinBucket, signedUrl: imageUrl }); // Fallback to original URL
    } else {
      console.log(`[supabaseStorage] Successfully created signed URL for '${pathWithinBucket}': ${signedUrlData.signedUrl}`); // Added log
      results.push({ originalPath: pathWithinBucket, signedUrl: signedUrlData.signedUrl });
    }
  }
  return results;
};