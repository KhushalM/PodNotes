import React, { useState, useEffect } from 'react';
import { PodcastContext, PodcastContextType } from './podcast-context-types';
import { Podcast, ChatMessage, Note, ApiError } from '@/types';
import { uploadPodcastFile, checkBackendAvailability, askQuestion } from '@/services/api';
import { toast } from 'sonner';

// Create the provider
export const PodcastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<string>("transcript");

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
      console.log("Upload API call completed successfully, received podcast:", newPodcast);
      console.log("Transcript type:", typeof newPodcast.transcript);
      console.log("Summary type:", typeof newPodcast.summary);
      
      // Check if we received actual data or mock data
      const isMockData = !newPodcast.transcript || 
                         (typeof newPodcast.transcript === 'string' && 
                          newPodcast.transcript.includes("sample transcript"));
      
      if (isMockData) {
        console.warn("Received mock data from API, this may indicate a backend connection issue");
      } else {
        console.log("Received real podcast data from backend");
      }
      
      // Update state with the new podcast
      setPodcasts(prev => {
        // Check if podcast with same ID already exists
        const exists = prev.some(p => p.id === newPodcast.id);
        if (exists) {
          console.log(`Podcast with ID ${newPodcast.id} already exists, updating it`);
          return prev.map(p => p.id === newPodcast.id ? newPodcast : p);
        } else {
          console.log(`Adding new podcast with ID ${newPodcast.id}`);
          return [newPodcast, ...prev];
        }
      });
      
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
      const response = await askQuestion(currentPodcast.id, message);
      
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

  const saveNote = (question: string, answer: string, messageId?: string) => {
    // Check if this note already exists
    const existingNoteIndex = notes.findIndex(
      note => note.podcastId === currentPodcast?.id && note.question === question && note.answer === answer
    );
    
    if (existingNoteIndex !== -1) {
      // Note exists, remove it
      const updatedNotes = [...notes];
      updatedNotes.splice(existingNoteIndex, 1);
      setNotes(updatedNotes);
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
      return;
    }
    
    // Note doesn't exist, add it
    const newNote: Note = {
      id: Date.now().toString(),
      podcastId: currentPodcast?.id || '',
      question,
      answer,
      timestamp: new Date().toISOString(),
      messageId
    };
    
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const showNoteInQA = (question: string, answer: string) => {
    if (!currentPodcast) return;
    
    // Switch to the chat tab
    setActiveTab("chat");
    
    // Find if this note has a saved messageId
    const existingNote = notes.find(
      note => note.podcastId === currentPodcast.id && note.question === question && note.answer === answer
    );
    
    // If we have a saved messageId, use it for scrolling
    if (existingNote?.messageId) {
      sessionStorage.setItem('scrollToMessageId', existingNote.messageId);
    } else {
      // Otherwise, create new message IDs
      const userMessageId = `note-user-${Date.now()}`;
      const aiMessageId = `note-ai-${Date.now() + 1}`;
      
      // Add the messages to the chat
      const userMessage: ChatMessage = {
        id: userMessageId,
        content: question,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        content: answer,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Store the message ID for scrolling
      sessionStorage.setItem('scrollToMessageId', aiMessageId);
    }
    
    // Notify user
    toast.success("Showing note in Q&A section");
  };

  const navigateToTranscriptSegment = (text: string, timestamp?: string) => {
    if (!currentPodcast) return;
    
    // Switch to the transcript tab
    setActiveTab("transcript");
    
    // Store the text to search for in sessionStorage
    sessionStorage.setItem('scrollToTranscriptText', text);
    
    if (timestamp) {
      sessionStorage.setItem('scrollToTranscriptTimestamp', timestamp);
    }
    
    // Notify user
    toast.success("Navigating to transcript segment");
  };

  const value = {
    podcasts,
    currentPodcast,
    isLoading,
    error,
    chatMessages,
    notes,
    activeTab,
    uploadPodcast,
    selectPodcast,
    sendChatMessage,
    saveNote,
    clearChat,
    showNoteInQA,
    setActiveTab,
    navigateToTranscriptSegment
  };

  return (
    <PodcastContext.Provider value={value}>
      {children}
    </PodcastContext.Provider>
  );
};

export type { PodcastContextType };
