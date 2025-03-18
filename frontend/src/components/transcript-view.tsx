
import React from 'react';
import { usePodcast } from '@/context/podcast-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TranscriptView: React.FC = () => {
  const { currentPodcast } = usePodcast();

  if (!currentPodcast) {
    return null;
  }

  return (
    <Card className="w-full overflow-hidden glass animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-pod-pink" />
            <span>Podcast Content</span>
          </div>
          <div className="chip">
            {new Date(currentPodcast.uploadDate).toLocaleDateString()}
          </div>
        </CardTitle>
      </CardHeader>
      <Tabs defaultValue="transcript">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="pt-3">
          <TabsContent value="transcript" className="mt-0">
            <div className="h-[400px] overflow-y-auto subtle-scroll p-4 bg-black/20 rounded-md">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {currentPodcast.transcript || "No transcript available."}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="summary" className="mt-0">
            <div className="h-[400px] overflow-y-auto subtle-scroll p-4 bg-black/20 rounded-md">
              <div className="flex gap-2 items-center mb-2">
                <Sparkles size={16} className="text-pod-pink" />
                <div className="text-xs font-medium text-pod-pink">AI-GENERATED SUMMARY</div>
              </div>
              <p className="text-sm leading-relaxed">
                {currentPodcast.summary || "No summary available."}
              </p>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default TranscriptView;
