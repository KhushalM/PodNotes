import React, { useState, useEffect, useCallback } from 'react';
import { usePodcast } from '@/hooks/use-podcast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Sparkles, Search, Clock, User, Tag, Download, Bookmark, BookmarkCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Define types for transcript segments and structured transcript
interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
  topic: string;
}

// Define interface for our new transcript format (array of segments)
interface TranscriptSegmentItem {
  start: string | number;
  end: string | number;
  speaker: string;
  text: string;
  topic?: string;
}

interface StructuredTranscript {
  segments?: TranscriptSegment[];
  text?: string;
  timestamped_text?: string;
  [key: string]: unknown; // Using unknown instead of any for better type safety
}

const TranscriptView: React.FC = () => {
  const { currentPodcast, saveNote, notes } = usePodcast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);

  // Helper function to convert time format (HH:MM:SS) to seconds
  const parseTimeToSeconds = useCallback((timeStr: string): number => {
    if (!timeStr) return 0;
    
    try {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // MM:SS format
        return parts[0] * 60 + parts[1];
      } else {
        return parseFloat(timeStr);
      }
    } catch (e) {
      console.error("Error parsing time:", timeStr, e);
      return 0;
    }
  }, []);

  // Function to format time from seconds to MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Parse transcript data based on its format
  const parseTranscript = useCallback((): TranscriptSegment[] => {
    if (!currentPodcast || !currentPodcast.transcript) {
      return [];
    }

    console.log("Parsing transcript:", currentPodcast.transcript);
    
    // If transcript is a string, return a simple segment
    if (typeof currentPodcast.transcript === 'string') {
      console.log("Transcript is a string");
      try {
        // Try to parse it as JSON first
        const parsedTranscript = JSON.parse(currentPodcast.transcript);
        
        // If it has segments array
        if (parsedTranscript.segments && Array.isArray(parsedTranscript.segments)) {
          return parsedTranscript.segments;
        }
        
        // If it has text property
        if (parsedTranscript.text) {
          return [{
            start: 0,
            end: 0,
            speaker: "Speaker",
            text: parsedTranscript.text,
            topic: "Transcript"
          }];
        }
      } catch (e) {
        // Not JSON, treat as plain text
        return [{
          start: 0,
          end: 0,
          speaker: "Speaker",
          text: currentPodcast.transcript,
          topic: "Transcript"
        }];
      }
    }
    
    // If transcript is an array (our new format)
    if (Array.isArray(currentPodcast.transcript)) {
      console.log("Transcript is an array of segments");
      // Explicitly type the transcript as an array of our segment items
      const typedTranscript: TranscriptSegmentItem[] = currentPodcast.transcript;
      console.log("Typed transcript:", currentPodcast.transcript);
      return typedTranscript.map((segment) => ({
        start: typeof segment.start === 'string' ? parseTimeToSeconds(segment.start) : segment.start || 0,
        end: typeof segment.end === 'string' ? parseTimeToSeconds(segment.end) : segment.end || 0,
        speaker: String(segment.speaker) || "Speaker",
        text: String(segment.text) || "",
        topic: String(segment.topic) || "Transcript"
      }));
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
    
    console.log("Unknown transcript format, returning empty array");
    return [];
  }, [currentPodcast, parseTimeToSeconds]);

  // Handle navigation from notes
  useEffect(() => {
    const scrollToText = sessionStorage.getItem('scrollToTranscriptText');
    const scrollToTimestamp = sessionStorage.getItem('scrollToTranscriptTimestamp');
    
    if (scrollToText && currentPodcast) {
      // Find the segment that contains this text
      const segments = parseTranscript();
      const segmentIndex = segments.findIndex(segment => 
        segment.text.includes(scrollToText) || 
        (scrollToTimestamp && formatTime(segment.start) === scrollToTimestamp)
      );
      
      if (segmentIndex !== -1) {
        // Set search query to help locate the text
        setSearchQuery(scrollToText);
        
        // Highlight the segment
        setHighlightedSegmentIndex(segmentIndex);
        
        // Scroll to the segment after a delay to ensure rendering
        setTimeout(() => {
          const segmentElement = document.getElementById(`transcript-segment-${segmentIndex}`);
          if (segmentElement) {
            segmentElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            // Add highlight effect
            segmentElement.classList.add('highlight-message');
            setTimeout(() => {
              segmentElement.classList.remove('highlight-message');
            }, 1000);
          }
        }, 100);
      }
      
      // Clear the session storage
      sessionStorage.removeItem('scrollToTranscriptText');
      sessionStorage.removeItem('scrollToTranscriptTimestamp');
    }
  }, [currentPodcast, parseTranscript, formatTime, parseTimeToSeconds]);

  if (!currentPodcast) {
    return null;
  }

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
    <Card className="w-full glass animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-pod-dark-blue" />
            <span>Podcast Content</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs bg-gray-900 border-gray-800 hover:bg-gray-800 text-white">
              <Download size={14} className="mr-1" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <Tabs defaultValue="transcript">
        <div className="mb-4 px-6">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-900">
            <TabsTrigger value="transcript" className="data-[state=active]:bg-black data-[state=active]:text-white">
              <FileText size={14} className="mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-black data-[state=active]:text-white">
              <Sparkles size={14} className="mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="px-6">
          <TabsContent value="transcript" className="mt-0">
            <div className="mb-4 flex gap-2">
              <div className="relative flex-grow">
                <Search size={16} className="absolute left-2.5 top-2.5 text-white/400" />
                <Input 
                  type="text" 
                  placeholder="Search transcript..." 
                  className="pl-9 bg-white/900 border-white/800 focus-visible:ring-white/700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className={`h-10 w-10 ${showTimestamps ? 'bg-black text-white border-white/800' : 'bg-gray-900 border-gray-800'}`}
                onClick={() => setShowTimestamps(!showTimestamps)}
              >
                <Clock size={16} />
              </Button>
            </div>
            
            <div className="h-[400px] overflow-y-auto pr-2 space-y-4 transcript-container">
              {filteredSegments.map((segment, index) => (
                <div 
                  key={index} 
                  id={`transcript-segment-${index}`}
                  className={`p-4 rounded-lg bg-white text-black border border-gray-200 shadow-subtle transition-all mx-2 ${highlightedSegmentIndex === index ? 'highlight-message' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm font-medium bg-gray-900 text-white`}
                      >
                        {segment.speaker[0]}
                      </div>
                      <div>
                        <div className="text-xs text-pod-dark-gray mb-1">
                          SPEAKER
                        </div>
                        <div className="font-medium">{segment.speaker}</div>
                        {showTimestamps && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Clock size={12} className="mr-1" />
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700 flex items-center">
                        <Tag size={10} className="mr-1" />
                        {segment.topic}
                      </div>
                      {/* Check if this segment is already saved as a note */}
                      {(() => {
                        const isAlreadySaved = notes.some(
                          note => 
                            note.podcastId === currentPodcast.id && 
                            note.question === `[Transcript] ${segment.speaker} (${formatTime(segment.start)})` && 
                            note.answer === segment.text
                        );
                        
                        return (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={isAlreadySaved ? "text-blue-500" : "text-gray-400 hover:text-blue-400"}
                            onClick={() => {
                              // Create a question format that includes speaker and timestamp
                              const question = `[Transcript] ${segment.speaker} (${formatTime(segment.start)})`;
                              saveNote(question, segment.text);
                            }}
                            title={isAlreadySaved ? "Remove from notes" : "Save to notes"}
                          >
                            {isAlreadySaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="mt-2 pl-10">
                    <p className="text-sm">
                      {searchQuery ? highlightText(segment.text, searchQuery) : segment.text}
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredSegments.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
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
            <div className="h-[400px] overflow-y-auto pr-2 px-2">
              {currentPodcast.summary ? (
                <div className="p-4 rounded-lg bg-white text-black shadow-subtle">
                  <div className="flex items-center mb-3">
                    <Sparkles size={16} className="text-pod-dark-blue mr-2" />
                    <div className="text-xs text-pod-dark-gray">
                      AI SUMMARY
                    </div>
                  </div>
                  <div className="space-y-4">
                    {currentPodcast.summary.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="text-sm">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Sparkles size={48} className="mb-2 opacity-20" />
                  <p>No summary available</p>
                </div>
              )}
              <div className="space-y-4 mt-8">
                <div className="p-4 rounded-lg bg-white text-black shadow-subtle">
                  <div className="flex items-center mb-2">
                    <Tag size={14} className="text-blue-400 mr-2" />
                    <div className="text-xs text-pod-dark-gray">
                      KEY TOPICS
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">AI Basics</div>
                    <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">AI Evolution</div>
                    <div className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">Future Trends</div>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">Ethics</div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-white text-black shadow-subtle mb-8">
                  <div className="flex items-center mb-2">
                    <User size={14} className="text-blue-400 mr-2" />
                    <div className="text-xs text-pod-dark-gray">
                      SPEAKERS
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400 mr-2">H</div>
                      <div className="text-sm text-gray-600">Host (Primary Speaker)</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-medium text-purple-400 mr-2">G</div>
                      <div className="text-sm text-gray-600">Guest (AI Expert)</div>
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
