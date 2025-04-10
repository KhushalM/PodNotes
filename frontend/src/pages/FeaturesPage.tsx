import React from 'react';
import { Upload, MicVocal, MessageSquare, ScrollText, NotebookText, History } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="bg-black backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col items-start space-y-3">
    <div className="bg-white p-3 rounded-full border">
      <Icon size={24} className="text-pod-contrast-blue" /> 
    </div>
    <h3 className="text-xl font-semibold text-white pt-2">{title}</h3>
    <p className="text-gray-300 text-sm leading-relaxed flex-grow">{description}</p>
  </div>
);

const FeaturesPage = () => {
  return (
    <div className="container mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center text-black">PodNotes Features</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <FeatureCard 
          icon={Upload}
          title="Podcast Upload & Processing"
          description="Easily upload your audio files (MP3, WAV, M4A). Our system automatically processes them for analysis."
        />
        <FeatureCard 
          icon={MicVocal}
          title="AI-Powered Transcription"
          description="Get accurate, timestamped transcriptions of your podcasts using advanced AI models (Whisper)."
        />
        <FeatureCard 
          icon={MessageSquare}
          title="Interactive Q&A"
          description="Ask questions directly about the podcast content and receive relevant answers based on the transcript."
        />
        <FeatureCard 
          icon={ScrollText}
          title="AI Summarization"
          description="Generate concise summaries of podcast episodes to quickly grasp the main points and key takeaways."
        />
        <FeatureCard 
          icon={NotebookText}
          title="Note Taking & Organization"
          description="Capture important insights, quotes, or ideas directly alongside the transcript or summary for easy reference."
        />
         <FeatureCard 
          icon={History}
          title="Podcast History"
          description="Access and manage all your uploaded and processed podcasts conveniently in one place."
        />
      </div>
    </div>
  );
};

export default FeaturesPage;
