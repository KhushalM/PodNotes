import React from 'react';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import UploadForm from '@/components/upload-form';
import TranscriptView from '@/components/transcript-view';
import QASection from '@/components/qa-section';
import NotesSection from '@/components/notes-section';
import PodcastHistory from '@/components/podcast-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePodcast } from '@/hooks/use-podcast';
import { Button } from '@/components/ui/button';
import { FileAudio, Headphones, BookOpen, MessageSquare, Upload } from 'lucide-react';
import { ElegantBackground } from '@/components/ui/elegant-background';
import { Link, Outlet } from 'react-router-dom';
import { PodcastProvider } from '@/context/podcast-context';

export const MainContent = () => {
  const { currentPodcast, podcasts } = usePodcast();

  if (podcasts.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold mb-4 text-black">
            Transform Podcasts into Knowledge
          </h1>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Upload your favorite podcasts, get AI-powered transcripts, summaries, and insights.
            Ask questions about the content and create notes for easy reference.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          <div className="flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-900 p-3 rounded-full">
                  <FileAudio size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Upload Any Podcast</h3>
              </div>
              <p className="text-foreground/70 pl-12">
                Simply upload your audio files and our AI will process them automatically.
                Supports MP3, WAV, and M4A formats.
              </p>
              
              <div className="flex items-center space-x-3">
                <div className="bg-gray-900 p-3 rounded-full">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Ask Questions</h3>
              </div>
              <p className="text-foreground/70 pl-12">
                Have a conversation about the podcast content. Ask specific questions
                and get accurate answers based on the transcript.
              </p>
              
              <div className="flex items-center space-x-3">
                <div className="bg-gray-900 p-3 rounded-full">
                  <BookOpen size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Create Notes</h3>
              </div>
              <p className="text-foreground/70 pl-12">
                Save important insights and summaries for later reference.
                Organize your knowledge from multiple podcasts.
              </p>
            </div>
          </div>
          
          <div className="bg-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-800">
            <UploadForm />
          </div>
        </div>
      </div>
    );
  }

  if (!currentPodcast) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold mb-4 text-black">
            Your Podcast Library
          </h1>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Select a podcast from your history or upload a new one to get started.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="order-2 md:order-1">
            <div className="bg-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-800">
              {/* <h2 className="text-2xl font-semibold mb-4 text-white flex items-center">
                <Headphones className="mr-2 text-gray-300" size={24} />
                Recent Podcasts
              </h2> */}
              <PodcastHistory />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="bg-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-800">
              <UploadForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 animate-fade-in bg-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white">{currentPodcast.name}</h1>
            <p className="text-white/60">
              Uploaded on {new Date(currentPodcast.uploadDate).toLocaleDateString()}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="bg-gray-900 border-gray-800 hover:bg-gray-800 text-white"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          >
            <Upload size={16} className="mr-2" />
            Upload New Podcast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-black backdrop-blur-sm rounded-xl shadow-xl border border-gray-800 overflow-hidden">
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 bg-gray-900">
                <TabsTrigger value="transcript" className="data-[state=active]:bg-black data-[state=active]:text-white text-gray-300 hover:text-white">
                  <FileAudio size={16} className="mr-2 text-pod-dark-blue" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-black data-[state=active]:text-white text-gray-300 hover:text-white">
                  <MessageSquare size={16} className="mr-2 text-pod-dark-blue" />
                  Ask Questions
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-black data-[state=active]:text-white text-gray-300 hover:text-white">
                  <BookOpen size={16} className="mr-2 text-pod-dark-blue" />
                  Notes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="transcript" className="mt-0 p-6">
                <TranscriptView />
              </TabsContent>
              <TabsContent value="chat" className="mt-0 p-6">
                <QASection />
              </TabsContent>
              <TabsContent value="notes" className="mt-0 p-6">
                <NotesSection />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div>
          <div className="space-y-6 sticky top-20">
            <div className="bg-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center">
                <Headphones className="mr-2 text-gray-300" size={20} />
                Your Podcasts
              </h2>
              <PodcastHistory />
            </div>
            <div className="bg-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-800">
              <UploadForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <ElegantBackground 
        dotColor="#1E2124" 
        dotOpacity={0.03}
        lineColor="#1E2124"
        lineOpacity={0.02}
        shapeCount={60}
      />
      <header className="sticky top-0 z-50 w-full backdrop-blur-sm border-b-2 border-border/40 bg-background/80">
        <div className="container flex h-16 items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center"> 
              <AnimatedLogo className="text-black dark:text-white" />
            </div>
            <nav className="hidden md:flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-primary/20" asChild>
                <Link to="/">Home</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-primary/20" asChild>
                <Link to="/features">Features</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-primary/20" asChild>
                <Link to="/about">About</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-grow relative z-10"> 
        <Outlet />
      </main>
      <footer className="border-t border-border/40 py-6 md:py-0">
        <div className="container flex flex-col md:flex-row justify-between items-center h-16">
          <div className="text-sm text-foreground/60">
            {new Date().getFullYear()} PodNotes. All rights reserved.
          </div>
          <div className="flex items-center space-x-4 text-sm text-foreground/60">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Index = () => {
  return (
    <PodcastProvider>
      <Layout /> 
    </PodcastProvider>
  );
};

export default Index;
