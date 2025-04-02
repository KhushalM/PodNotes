import { Podcast, ApiError } from '@/types';

// Determine the correct API URL based on the environment
// This helps handle different development environments
const getApiUrl = () => {
  // Default to port 8001 for the backend
  return 'http://localhost:8001';
};

const API_URL = getApiUrl();
console.log(`API URL set to: ${API_URL}`);

// Flag to enable mock mode when backend is unavailable
let useMockData = false;

// Check if backend is available
export const checkBackendAvailability = async () => {
  console.log(`Checking backend availability...`);
  try {
    // Use the root endpoint with HEAD request which is now working
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_URL}/`, {
      method: 'HEAD',
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`Backend connection status: ${response.status}`);
    
    // If we can connect to the backend at all, consider it available
    useMockData = false;
    return true;
  } catch (error) {
    console.warn('Backend connection failed:', error);
    useMockData = true;
    return false;
  }
};

// Try to check backend availability on module load
checkBackendAvailability().then(available => {
  console.log(`Backend availability check completed. Available: ${available}, Using mock data: ${useMockData}`);
}).catch(error => {
  console.error('Error during backend availability check:', error);
  useMockData = true;
});

// Mock data generators
const generateMockPodcast = (file: File): Podcast => ({
  id: `podcast-${Date.now()}`,
  name: file.name,
  uploadDate: new Date().toISOString(),
  transcript: "This is a sample transcript. In a real application, this would be the actual transcript from the uploaded podcast.",
  summary: "This is a sample summary. In a real application, this would be the AI-generated summary of the podcast content."
});

const generateMockAnswer = (question: string): string => 
  `This is a sample response to: "${question}". In a real application, this would be the AI-generated response based on the podcast transcript.`;

export const uploadPodcastFile = async (file: File): Promise<Podcast> => {
  console.log(`Starting upload for podcast file: ${file.name} (${file.size} bytes)`);
  
  try {
    // If backend is not available, return mock data
    if (useMockData) {
      console.log('Using mock data for upload (backend unavailable)');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockPodcast = generateMockPodcast(file);
      console.log('Generated mock podcast:', mockPodcast);
      return mockPodcast;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadUrl = `${API_URL}/upload/`;
    console.log(`Sending upload request to ${uploadUrl}`);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    console.log(`Upload response status: ${response.status}`);
    
    if (!response.ok) {
      // Try to get error details if available
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.detail || JSON.stringify(errorData);
        console.warn(`Backend error details: ${errorDetails}`);
      } catch (e) {
        errorDetails = `Status: ${response.status} ${response.statusText}`;
        console.warn(`Could not parse error response: ${errorDetails}`);
      }
      
      console.warn(`Backend returned error: ${errorDetails}. Using mock data.`);
      return generateMockPodcast(file);
    }
    
    console.log('Upload successful, parsing response...');
    const data = await response.json();
    console.log('Response data:', data);
    
    return {
      id: file.name, // Using filename as ID as per backend implementation
      name: file.name,
      uploadDate: new Date().toISOString(),
      transcript: data.transcript,
      summary: data.summary
    };
  } catch (error) {
    console.error('Error uploading podcast:', error);
    
    // If error occurs, fall back to mock data
    console.warn('Using mock data due to error');
    const mockPodcast = generateMockPodcast(file);
    console.log('Generated mock podcast:', mockPodcast);
    return mockPodcast;
  }
};

export const askQuestion = async (podcastId: string, question: string): Promise<string> => {
  try {
    // If backend is not available, return mock data
    if (useMockData) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return generateMockAnswer(question);
    }
    
    const formData = new FormData();
    formData.append('question', question);
    
    const response = await fetch(`${API_URL}/qa/${podcastId}`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      // If backend returns error, fall back to mock data
      console.warn(`Backend returned error: ${response.status}. Using mock data.`);
      return generateMockAnswer(question);
    }
    
    const data = await response.json();
    
    return data.answer;
  } catch (error) {
    console.error('Error asking question:', error);
    
    // If error occurs, fall back to mock data
    console.warn('Using mock data due to error');
    return generateMockAnswer(question);
  }
};
