
import React, { useState, useRef, useEffect } from 'react';
import { usePodcast } from '@/context/podcast-context';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Save, Trash2, Loader2 } from 'lucide-react';

const ChatInterface: React.FC = () => {
  const { currentPodcast, chatMessages, isLoading, sendChatMessage, saveNote, clearChat } = usePodcast();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    sendChatMessage(message);
    setMessage('');
  };

  const handleSaveNote = () => {
    // Find the last question and answer pair
    const lastUserMessageIndex = [...chatMessages].reverse().findIndex(msg => msg.role === 'user');
    if (lastUserMessageIndex === -1) return;
    
    const lastUserMessage = [...chatMessages].reverse()[lastUserMessageIndex];
    const lastAiMessageIndex = [...chatMessages].reverse().findIndex(msg => msg.role === 'assistant');
    
    if (lastAiMessageIndex === -1) return;
    const lastAiMessage = [...chatMessages].reverse()[lastAiMessageIndex];
    
    saveNote(lastUserMessage.content, lastAiMessage.content);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!currentPodcast) {
    return null;
  }

  return (
    <Card className="w-full overflow-hidden glass animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-pod-dark-blue" />
            <span>Ask About This Podcast</span>
          </div>
          <div className="flex gap-2">
            {chatMessages.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8" 
                  onClick={handleSaveNote}
                >
                  <Save size={14} className="mr-1" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8" 
                  onClick={clearChat}
                >
                  <Trash2 size={14} className="mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="h-[350px] overflow-y-auto subtle-scroll p-2">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-pod-dark-gray">
              <MessageSquare size={40} className="opacity-40 mb-3" />
              <p className="text-center max-w-md">
                Ask questions about the podcast content. The AI will answer based on the transcript.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`
                    flex 
                    ${msg.role === 'user' ? 'justify-end' : 'justify-start'}
                    animate-slide-up
                  `}
                >
                  <div
                    className={`
                      max-w-[80%] px-4 py-3 rounded-lg
                      ${msg.role === 'user' 
                        ? 'bg-pod-blue text-white rounded-tr-none' 
                        : 'bg-white rounded-tl-none'}
                    `}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`
                      text-xs mt-1 
                      ${msg.role === 'user' ? 'text-white/70' : 'text-pod-dark-gray'}
                    `}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4 pb-4">
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question about this podcast..."
            className="bg-white"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !message.trim()}>
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;
