/**
 * Utility function to capture a Leaflet map as an image
 * @param mapContainerId The ID of the map container element
 * @returns Promise that resolves to a base64 image string
 */
export const captureMapImage = async (mapContainerId: string = 'map-container'): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Wait for the map to be fully rendered
    setTimeout(() => {
      const mapContainer = document.querySelector(`#${mapContainerId}`) as HTMLElement;
      
      if (!mapContainer) {
        reject(new Error(`Map container with id '${mapContainerId}' not found`));
        return;
      }

      // Use html2canvas to capture the map
      import('html2canvas').then((html2canvas) => {
        html2canvas.default(mapContainer, {
          useCORS: true,
          allowTaint: true,
          scale: 1,
          logging: false,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          // Convert canvas to base64 image
          const imageData = canvas.toDataURL('image/png');
          resolve(imageData);
        }).catch((error) => {
          reject(new Error(`Failed to capture map image: ${error.message}`));
        });
      }).catch((error) => {
        reject(new Error(`Failed to load html2canvas: ${error.message}`));
      });
    }, 500); // Wait 500ms to ensure map is fully rendered
  });
};

/**
 * Convert base64 image to File object for upload
 * @param base64Data Base64 image string
 * @param filename Name for the file
 * @returns File object
 */
export const base64ToFile = (base64Data: string, filename: string): File => {
  const arr = base64Data.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};