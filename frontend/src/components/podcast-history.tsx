
import React from 'react';
import { usePodcast } from '@/context/podcast-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { History, FileAudio, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

const PodcastHistory: React.FC = () => {
  const { podcasts, currentPodcast, selectPodcast } = usePodcast();
  
  return (
    <Card className="w-full glass animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-pod-dark-blue" />
            <span>Podcast History</span>
          </div>
          <div className="chip">
            {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {podcasts.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-pod-dark-gray">
              <FileAudio size={40} className="opacity-40 mb-3" />
              <p className="text-center max-w-md">
                Upload your first podcast to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {podcasts.map((podcast) => (
                <Button
                  key={podcast.id}
                  variant="outline"
                  className={`w-full justify-start p-4 h-auto text-left ${
                    currentPodcast?.id === podcast.id ? 'border-pod-blue bg-pod-light-blue/30' : ''
                  }`}
                  onClick={() => selectPodcast(podcast.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="bg-pod-light-blue p-2 rounded-full">
                      <FileAudio size={20} className="text-pod-dark-blue" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{podcast.name}</p>
                      <p className="text-xs text-pod-dark-gray">
                        {new Date(podcast.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    {currentPodcast?.id === podcast.id && (
                      <div className="bg-pod-blue p-1 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PodcastHistory;
