// Define the Podcast type
export interface Podcast {
  id: string;
  name: string;
  uploadDate: string;
  transcript: string;
  summary: string;
}

// Define the ChatMessage type
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

// Define the Note type
export interface Note {
  id: string;
  podcastId: string;
  question: string;
  answer: string;
  timestamp: string;
  messageId?: string; // Optional message ID for chat notes
}

// Define the ApiError type
export interface ApiError {
  message: string;
  details?: string;
}
