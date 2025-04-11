import React, { useState } from 'react';
import { usePodcast } from '@/hooks/use-podcast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, HelpCircle, MessageSquare, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FormattedContent from '@/components/ui/formatted-content';

const NotesSection: React.FC = () => {
  const { currentPodcast, notes, showNoteInQA, saveNote, navigateToTranscriptSegment } = usePodcast();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  if (!currentPodcast) return null;
  
  const podcastNotes = notes.filter(note => note.podcastId === currentPodcast.id);
  
  const handleNoteClick = (noteId: string, question: string, answer: string) => {
    // Set this note as active
    setActiveNoteId(noteId);
    
    // If this is a transcript note, handle differently
    if (question.startsWith('[Transcript]')) {
      // Extract timestamp from the question if available
      const timestampMatch = question.match(/\((\d+:\d+)\)/);
      const timestamp = timestampMatch ? timestampMatch[1] : undefined;
      
      // Navigate to the transcript segment
      navigateToTranscriptSegment(answer, timestamp);
      return;
    }
    
    // Show the note in the QA section - this will handle the tab switching
    // and set up the message ID for scrolling within the chat container
    showNoteInQA(question, answer);
    
    // No need to scroll the entire page anymore as the QA section handles internal scrolling
  };
  
  const handleDeleteNote = (e: React.MouseEvent, noteId: string, question: string, answer: string) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    
    // Use the saveNote function to toggle (which will remove since it exists)
    saveNote(question, answer);
    
    // Clear active note if it was deleted
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
    }
  };
  
  return (
    <Card className="w-full glass animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-pod-dark-blue" />
            <span>Saved Notes</span>
          </div>
          <div className="chip">
            {podcastNotes.length} {podcastNotes.length === 1 ? 'note' : 'notes'}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {podcastNotes.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-pod-dark-gray">
              <BookOpen size={40} className="opacity-40 mb-3" />
              <p className="text-center max-w-md">
                Ask questions in the chat and save interesting responses as notes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {podcastNotes.map((note) => (
                <div 
                  key={note.id} 
                  className={`bg-white rounded-lg p-4 animate-fade-in shadow-subtle hover:shadow-md transition-all cursor-pointer relative ${activeNoteId === note.id ? 'border-2 border-pod-blue shadow-md' : ''}`}
                  onClick={() => handleNoteClick(note.id, note.question, note.answer)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={(e) => handleDeleteNote(e, note.id, note.question, note.answer)}
                    title="Delete note"
                  >
                    <Trash2 size={16} />
                  </Button>
                  
                  <div className="flex items-start gap-3 mb-3">
                    <HelpCircle size={16} className="text-pod-dark-blue shrink-0 mt-1" />
                    <div>
                      <div className="text-xs text-pod-dark-gray mb-1">
                        {note.question.startsWith('[Transcript]') ? 'TRANSCRIPT' : 'QUESTION'}
                      </div>
                      <p className="font-medium text-black pr-6">{note.question}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-black">
                    <MessageSquare size={16} className="text-pod-blue shrink-0 mt-1" />
                    <div>
                      <div className="text-xs text-pod-dark-gray mb-1">
                        {note.question.startsWith('[Transcript]') ? 'CONTENT' : 'ANSWER'}
                      </div>
                      {note.question.startsWith('[Transcript]') ? (
                        <p className="text-sm">{note.answer}</p>
                      ) : (
                        <FormattedContent content={note.answer} />
                      )}
                      <div className="mt-2 text-xs text-pod-dark-gray">
                        {new Date(note.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotesSection;
