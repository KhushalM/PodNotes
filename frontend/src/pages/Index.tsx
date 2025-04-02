import React from 'react';
import Logo from '@/components/logo';
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

const MainContent = () => {
  const { currentPodcast, podcasts } = usePodcast();

  if (podcasts.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pod-black to-pod-rich-black text-transparent bg-clip-text">
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
                <div className="bg-pod-light-beige p-3 rounded-full">
                  <FileAudio size={24} className="text-pod-black" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Upload Any Podcast</h3>
              </div>
              <p className="text-foreground/70 pl-12">
                Simply upload your audio files and our AI will process them automatically.
                Supports MP3, WAV, and M4A formats.
              </p>
              
              <div className="flex items-center space-x-3">
                <div className="bg-pod-light-beige p-3 rounded-full">
                  <MessageSquare size={24} className="text-pod-black" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Ask Questions</h3>
              </div>
              <p className="text-foreground/70 pl-12">
                Have a conversation about the podcast content. Ask specific questions
                and get accurate answers based on the transcript.
              </p>
              
              <div className="flex items-center space-x-3">
                <div className="bg-pod-light-beige p-3 rounded-full">
                  <BookOpen size={24} className="text-pod-black" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Create Notes</h3>
              </div>
              <p className="text-foreground/70 pl-12">
                Save important insights and summaries for later reference.
                Organize your knowledge from multiple podcasts.
              </p>
            </div>
          </div>
          
          <div>
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
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pod-black to-pod-rich-black text-transparent bg-clip-text">
            Your Podcast Library
          </h1>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Select a podcast from your history or upload a new one to get started.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="order-2 md:order-1">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-700/50">
              <h2 className="text-2xl font-semibold mb-4 text-white flex items-center">
                <Headphones className="mr-2 text-blue-400" size={24} />
                Recent Podcasts
              </h2>
              <PodcastHistory />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <UploadForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 animate-fade-in bg-gradient-to-br from-pod-black to-pod-rich-black backdrop-blur-sm rounded-xl p-6 shadow-xl border border-pod-black/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white">{currentPodcast.name}</h1>
            <p className="text-white/60">
              Uploaded on {new Date(currentPodcast.uploadDate).toLocaleDateString()}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="bg-pod-light-beige/10 border-pod-light-beige/30 hover:bg-pod-light-beige/20 text-pod-black"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          >
            <Upload size={16} className="mr-2" />
            Upload New Podcast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-pod-light-beige/50 to-pod-black/50 backdrop-blur-sm rounded-xl shadow-xl border border-pod-black/30 overflow-hidden">
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 bg-pod-light-beige/50">
                <TabsTrigger value="transcript" className="data-[state=active]:bg-pod-light-beige/20 data-[state=active]:text-pod-black">
                  <FileAudio size={16} className="mr-2" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-pod-black/20 data-[state=active]:text-pod-rich-black">
                  <MessageSquare size={16} className="mr-2" />
                  Ask Questions
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-pod-light-beige/20 data-[state=active]:text-pod-black">
                  <BookOpen size={16} className="mr-2" />
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
            <div className="bg-gradient-to-br from-pod-light-beige/50 to-pod-black/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-pod-black/30">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <Headphones className="mr-2 text-pod-black" size={20} />
                Your Podcasts
              </h2>
              <PodcastHistory />
            </div>
            <UploadForm />
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <ElegantBackground 
        dotColor="#1E2124" 
        dotOpacity={0.15}
        lineColor="#1E2124"
        lineOpacity={0.08}
        dotCount={60}
      />
      <header className="sticky top-0 z-50 w-full backdrop-blur-sm border-b border-border/40 bg-background/80">
        <div className="container flex h-16 items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            <nav className="hidden md:flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-primary/20">
                Home
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-primary/20">
                Features
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-primary/20">
                About
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
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
    <Layout>
      <div className="container mx-auto pb-20">
        <MainContent />
      </div>
    </Layout>
  );
};

export default Index;
