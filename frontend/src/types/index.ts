export interface Podcast {
  id: string;
  name: string;
  uploadDate: string;
  transcript?: string;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface Note {
  id: string;
  podcastId: string;
  question: string;
  answer: string;
  timestamp: string;
  messageId?: string; // Optional message ID for chat notes
}

export interface ApiError {
  message: string;
  status?: number;
}
