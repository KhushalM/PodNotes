import { createContext } from 'react';
import { Podcast, ChatMessage, Note, ApiError } from '@/types';

export interface PodcastContextType {
  podcasts: Podcast[];
  currentPodcast: Podcast | null;
  isLoading: boolean;
  error: ApiError | null;
  chatMessages: ChatMessage[];
  notes: Note[];
  uploadPodcast: (file: File) => Promise<void>;
  selectPodcast: (id: string) => void;
  sendChatMessage: (message: string) => Promise<void>;
  saveNote: (question: string, answer: string) => void;
  clearChat: () => void;
}

export const PodcastContext = createContext<PodcastContextType | undefined>(undefined);
