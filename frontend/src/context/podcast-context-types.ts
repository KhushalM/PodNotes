import { createContext } from 'react';
import { Podcast, ChatMessage, Note, ApiError } from '@/types';

export interface PodcastContextType {
  podcasts: Podcast[];
  currentPodcast: Podcast | null;
  isLoading: boolean;
  error: ApiError | null;
  chatMessages: ChatMessage[];
  notes: Note[];
  activeTab: string;
  uploadPodcast: (file: File) => Promise<void>;
  selectPodcast: (id: string) => void;
  sendChatMessage: (message: string) => Promise<void>;
  saveNote: (question: string, answer: string, messageId?: string) => void;
  clearChat: () => void;
  showNoteInQA: (question: string, answer: string) => void;
  setActiveTab: (tab: string) => void;
  navigateToTranscriptSegment: (text: string, timestamp?: string) => void;
}

export const PodcastContext = createContext<PodcastContextType | undefined>(undefined);
