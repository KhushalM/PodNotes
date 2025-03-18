import React, { useState } from 'react';
import { PodcastProvider } from '@/context/podcast-context';
import Logo from '@/components/logo';
import UploadForm from '@/components/upload-form';
import TranscriptView from '@/components/transcript-view';
import ChatInterface from '@/components/chat-interface';
import NotesSection from '@/components/notes-section';
import PodcastHistory from '@/components/podcast-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePodcast } from '@/context/podcast-context';

const MainContent = () => {
  const { currentPodcast, podcasts } = usePodcast();

  if (podcasts.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl font-medium mb-3 text-gradient">Transform Podcasts into Knowledge</h1>
          <p className="text-white/70 max-w-lg mx-auto">
            Upload your podcasts, get AI-powered transcripts, ask questions, and create notes
            for easy reference.
          </p>
        </div>
        <UploadForm />
      </div>
    );
  }

  if (!currentPodcast) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl font-medium mb-3 text-gradient">Your Podcast Library</h1>
          <p className="text-white/70 max-w-lg mx-auto">
            Select a podcast from your history or upload a new one.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UploadForm />
          <PodcastHistory />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-medium mb-2 text-white">{currentPodcast.name}</h1>
        <p className="text-white/60">
          Uploaded on {new Date(currentPodcast.uploadDate).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="chat">Ask Questions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="mt-0">
              <TranscriptView />
            </TabsContent>
            <TabsContent value="chat" className="mt-0">
              <ChatInterface />
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <NotesSection />
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <div className="space-y-6">
            <UploadForm />
            <PodcastHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <PodcastProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-10 w-full">
          <div className="container mx-auto">
            <div className="header-logo-centered">
              <div className="logo-container">
                <Logo size="lg" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto">
          <MainContent />
        </main>
        <footer className="py-6 text-center text-white/50 text-sm">
          <p>PodNotes - Transform your podcast listening experience</p>
        </footer>
      </div>
    </PodcastProvider>
  );
};

export default Index;
