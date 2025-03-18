import React, { createContext, useContext, useState, useEffect } from 'react';
import { Podcast, ChatMessage, Note, ApiError } from '@/types';
import { toast } from 'sonner';
import { uploadPodcastFile, askQuestion as apiAskQuestion } from '@/services/api';

interface PodcastContextType {
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

const PodcastContext = createContext<PodcastContextType | undefined>(undefined);

export const PodcastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedPodcasts = localStorage.getItem('podcasts');
    const savedNotes = localStorage.getItem('notes');
    
    if (savedPodcasts) {
      setPodcasts(JSON.parse(savedPodcasts));
    }
    
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('podcasts', JSON.stringify(podcasts));
  }, [podcasts]);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const uploadPodcast = async (file: File) => {
    console.log("Starting podcast upload process...");
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Calling uploadPodcastFile API with file: ${file.name} (${file.size} bytes)`);
      // Call the real API function
      const newPodcast = await uploadPodcastFile(file);
      console.log("Upload API call completed successfully:", newPodcast);
      
      setPodcasts(prev => [newPodcast, ...prev]);
      setCurrentPodcast(newPodcast);
      setChatMessages([]);
      
      toast.success("Podcast uploaded successfully!");
    } catch (err) {
      console.error("Error uploading podcast:", err);
      setError({ message: "Failed to upload podcast. Please try again." });
      toast.error("Failed to upload podcast");
    } finally {
      setIsLoading(false);
      console.log("Upload process completed");
    }
  };

  const selectPodcast = (id: string) => {
    const podcast = podcasts.find(p => p.id === id) || null;
    setCurrentPodcast(podcast);
    setChatMessages([]);
  };

  const sendChatMessage = async (message: string) => {
    if (!currentPodcast) {
      setError({ message: "Please select a podcast first" });
      toast.error("Please select a podcast first");
      return;
    }
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: message,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      // Call the real API function
      const response = await apiAskQuestion(currentPodcast.id, message);
      
      // Create AI response message
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        content: response,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError({ message: "Failed to get response. Please try again." });
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = (question: string, answer: string) => {
    if (!currentPodcast) return;
    
    const newNote: Note = {
      id: `note-${Date.now()}`,
      podcastId: currentPodcast.id,
      question,
      answer,
      timestamp: new Date().toISOString()
    };
    
    setNotes(prev => [newNote, ...prev]);
    toast.success("Note saved successfully!");
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const value = {
    podcasts,
    currentPodcast,
    isLoading,
    error,
    chatMessages,
    notes,
    uploadPodcast,
    selectPodcast,
    sendChatMessage,
    saveNote,
    clearChat
  };

  return (
    <PodcastContext.Provider value={value}>
      {children}
    </PodcastContext.Provider>
  );
};

export const usePodcast = (): PodcastContextType => {
  const context = useContext(PodcastContext);
  if (context === undefined) {
    throw new Error('usePodcast must be used within a PodcastProvider');
  }
  return context;
};
