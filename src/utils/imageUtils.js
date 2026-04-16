const BACKEND_URL = 'http://10.54.71.107:5001'; 

export const getImageUrl = (url) => {
  if (!url) return null;
  // If it's already a full URL or a local device file, return it directly
  if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('data:')) return url;
  
  // Ensure we don't get double slashes like http://ip:5000//uploads/...
  const formattedUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${formattedUrl}`;
};
