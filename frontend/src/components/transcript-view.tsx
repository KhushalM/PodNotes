import React, { useState } from 'react';
import { usePodcast } from '@/hooks/use-podcast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Sparkles, Search, Clock, User, Tag, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TranscriptView: React.FC = () => {
  const { currentPodcast } = usePodcast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);

  if (!currentPodcast) {
    return null;
  }

  // Define types for transcript segments and structured transcript
  interface TranscriptSegment {
    start: number;
    end: number;
    speaker: string;
    text: string;
    topic: string;
  }

  interface StructuredTranscript {
    segments?: TranscriptSegment[];
    text?: string;
    timestamped_text?: string;
    [key: string]: unknown; // Using unknown instead of any for better type safety
  }

  // Function to format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Parse transcript data based on its format
  const parseTranscript = (): TranscriptSegment[] => {
    console.log("Parsing transcript:", currentPodcast.transcript);
    
    // If transcript is a string, return a simple segment
    if (typeof currentPodcast.transcript === 'string') {
      console.log("Transcript is a string");
      return [{
        start: 0,
        end: 0,
        speaker: "Speaker",
        text: currentPodcast.transcript,
        topic: "Transcript"
      }];
    }
    
    // If transcript is an object with segments
    if (typeof currentPodcast.transcript === 'object' && currentPodcast.transcript !== null) {
      console.log("Transcript is an object");
      const transcript = currentPodcast.transcript as StructuredTranscript;
      
      // Check if it has segments array
      if (transcript.segments && Array.isArray(transcript.segments)) {
        console.log("Transcript has segments array");
        return transcript.segments.map((segment: TranscriptSegment) => ({
          start: typeof segment.start === 'string' ? parseFloat(segment.start) : segment.start || 0,
          end: typeof segment.end === 'string' ? parseFloat(segment.end) : segment.end || 0,
          speaker: segment.speaker || "Speaker",
          text: segment.text || "",
          topic: segment.topic || "Transcript"
        }));
      }
      
      // If it has text property
      if (transcript.text) {
        console.log("Transcript has text property");
        return [{
          start: 0,
          end: 0,
          speaker: "Speaker",
          text: transcript.text,
          topic: "Transcript"
        }];
      }
    }
    
    // Fallback to empty array if format is unknown
    console.warn("Unknown transcript format, returning empty array");
    return [];
  };

  // Get segments from the actual transcript
  const segments = parseTranscript();
  console.log("Parsed segments:", segments);

  // Function to highlight search terms
  const highlightText = (text: string, query: string): JSX.Element => {
    if (!query.trim()) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="bg-yellow-500/30 text-white font-medium px-1 rounded">{part}</span> 
            : part
        )}
      </>
    );
  };

  // Filter segments based on search query
  const filteredSegments = searchQuery 
    ? segments.filter(segment => 
        segment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        segment.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        segment.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : segments;

  return (
    <Card className="w-full overflow-hidden animate-fade-in bg-transparent border-none shadow-none">
      <CardHeader className="pb-3 px-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            <span>Podcast Content</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs bg-slate-800/50 border-slate-700 hover:bg-slate-700/50">
              <Download size={14} className="mr-1" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <Tabs defaultValue="transcript">
        <div className="mb-4">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-800/70">
            <TabsTrigger value="transcript" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <FileText size={14} className="mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Sparkles size={14} className="mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="p-0">
          <TabsContent value="transcript" className="mt-0">
            <div className="mb-4 flex gap-2">
              <div className="relative flex-grow">
                <Search size={16} className="absolute left-2.5 top-2.5 text-slate-400" />
                <Input 
                  type="text" 
                  placeholder="Search transcript..." 
                  className="pl-9 bg-slate-800/50 border-slate-700 focus-visible:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className={`h-10 w-10 ${showTimestamps ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-800/50 border-slate-700'}`}
                onClick={() => setShowTimestamps(!showTimestamps)}
              >
                <Clock size={16} />
              </Button>
            </div>
            
            <div className="h-[500px] overflow-y-auto pr-2 space-y-4 transcript-container">
              {filteredSegments.map((segment, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg bg-gradient-to-r from-slate-800/70 to-slate-800/50 border border-slate-700/50 transition-all hover:border-slate-600/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm font-medium ${
                          segment.speaker === "Host" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {segment.speaker[0]}
                      </div>
                      <div>
                        <div className="font-medium text-white">{segment.speaker}</div>
                        {showTimestamps && (
                          <div className="text-xs text-slate-400 flex items-center">
                            <Clock size={12} className="mr-1" />
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-full bg-slate-700/50 text-xs font-medium text-slate-300 flex items-center">
                      <Tag size={10} className="mr-1" />
                      {segment.topic}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80 pl-10">
                    {searchQuery ? highlightText(segment.text, searchQuery) : segment.text}
                  </p>
                </div>
              ))}
              
              {filteredSegments.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <Search size={48} className="mb-2 opacity-20" />
                  <p>No results found for "{searchQuery}"</p>
                  <Button 
                    variant="link" 
                    className="text-blue-400 mt-2"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="summary" className="mt-0">
            <div className="h-[500px] overflow-y-auto pr-2">
              <div className="p-5 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-4">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-purple-500/20 mr-2">
                    <Sparkles size={16} className="text-purple-400" />
                  </div>
                  <div className="text-sm font-medium text-purple-400">AI-GENERATED SUMMARY</div>
                </div>
                <p className="text-sm leading-relaxed text-white/90">
                  {currentPodcast.summary || 
                    "In this podcast episode, the host and guest discuss the future of AI technology, covering its basic definition, recent evolution, and potential impact. The guest explains that AI systems perform tasks requiring human intelligence, such as visual perception and language processing. They note the remarkable advancement pace over the past five years, highlighting how large language models have transformed human-AI interaction."}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center mb-2">
                    <Tag size={14} className="text-blue-400 mr-2" />
                    <div className="text-sm font-medium text-white">Key Topics</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">AI Basics</div>
                    <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">AI Evolution</div>
                    <div className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">Future Trends</div>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">Ethics</div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center mb-2">
                    <User size={14} className="text-blue-400 mr-2" />
                    <div className="text-sm font-medium text-white">Speakers</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400 mr-2">H</div>
                      <div className="text-sm text-white/80">Host (Primary Speaker)</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-medium text-purple-400 mr-2">G</div>
                      <div className="text-sm text-white/80">Guest (AI Expert)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default TranscriptView;
