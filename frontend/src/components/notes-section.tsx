
import React from 'react';
import { usePodcast } from '@/context/podcast-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, HelpCircle, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const NotesSection: React.FC = () => {
  const { currentPodcast, notes } = usePodcast();
  
  if (!currentPodcast) return null;
  
  const podcastNotes = notes.filter(note => note.podcastId === currentPodcast.id);
  
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
                <div key={note.id} className="bg-white rounded-lg p-4 animate-fade-in shadow-subtle">
                  <div className="flex items-start gap-3 mb-3">
                    <HelpCircle size={16} className="text-pod-dark-blue shrink-0 mt-1" />
                    <div>
                      <div className="text-xs text-pod-dark-gray mb-1">
                        QUESTION
                      </div>
                      <p className="font-medium">{note.question}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MessageSquare size={16} className="text-pod-blue shrink-0 mt-1" />
                    <div>
                      <div className="text-xs text-pod-dark-gray mb-1">
                        ANSWER
                      </div>
                      <p className="text-sm">{note.answer}</p>
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
