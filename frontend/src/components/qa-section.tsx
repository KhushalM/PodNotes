import React, { useState, useEffect, useRef } from 'react';
import { usePodcast } from '@/hooks/use-podcast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Send, Sparkles, ThumbsUp, ThumbsDown, Copy, Bookmark, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { askQuestion } from '@/services/api';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  liked?: boolean;
  disliked?: boolean;
  saved?: boolean;
}

const QASection: React.FC = () => {
  const { currentPodcast, saveNote } = usePodcast();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showChat, setShowChat] = useState(true);
  const isInitialRender = useRef(true);

  // Load saved messages from localStorage when podcast changes
  useEffect(() => {
    if (currentPodcast) {
      const savedMessages = localStorage.getItem(`chat_messages_${currentPodcast.id}`);
      if (savedMessages) {
        try {
          // Parse the saved messages and convert timestamps from strings to Date objects
          const parsedMessages = JSON.parse(savedMessages);
          const messagesWithDateObjects = parsedMessages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDateObjects);
        } catch (e) {
          console.error("Error parsing saved messages:", e);
        }
      }
    }
  }, [currentPodcast]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (currentPodcast && messages.length > 0) {
      localStorage.setItem(`chat_messages_${currentPodcast.id}`, JSON.stringify(messages));
    }
  }, [messages, currentPodcast]);

  // Reset isInitialRender after component mounts
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
    }
  }, []);

  if (!currentPodcast) {
    return null;
  }

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior if event is provided
    if (e) {
      e.preventDefault();
    }
    
    if (!question.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    
    try {
      console.log(`Asking question about podcast ${currentPodcast.id}: "${question}"`);
      
      // Call the real API to get an answer
      const answer = await askQuestion(currentPodcast.id, question);
      console.log(`Received answer from API:`, answer);
      
      // Add assistant message with the real answer
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting answer:", error);
      toast.error("Failed to get answer. Please try again.");
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process your question. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = async (q: string) => {
    setQuestion(q);
    
    // Directly submit the question without setTimeout
    // Create a copy of the question to use in the async function
    const questionToAsk = q;
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: questionToAsk,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    
    try {
      console.log(`Asking suggested question about podcast ${currentPodcast.id}: "${questionToAsk}"`);
      
      // Call the API directly
      const answer = await askQuestion(currentPodcast.id, questionToAsk);
      console.log(`Received answer from API:`, answer);
      
      // Add assistant message with the answer
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting answer:", error);
      toast.error("Failed to get answer. Please try again.");
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process your question. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, type: 'like' | 'dislike' | 'save') => {
    setMessages(prev => 
      prev.map(message => {
        if (message.id === messageId) {
          if (type === 'like') {
            return { 
              ...message, 
              liked: !message.liked, 
              disliked: false 
            };
          } else if (type === 'dislike') {
            return { 
              ...message, 
              disliked: !message.disliked, 
              liked: false 
            };
          } else if (type === 'save') {
            const newSavedState = !message.saved;
            
            // Find the question that corresponds to this answer
            if (message.role === 'assistant') {
              const messageIndex = prev.findIndex(m => m.id === messageId);
              // Look for the most recent user message before this assistant message
              let questionIndex = -1;
              for (let i = messageIndex - 1; i >= 0; i--) {
                if (prev[i].role === 'user') {
                  questionIndex = i;
                  break;
                }
              }
              
              if (questionIndex >= 0) {
                // Save the note to the global context
                console.log('Saving note:', prev[questionIndex].content, message.content);
                saveNote(prev[questionIndex].content, message.content);
                toast.success(newSavedState ? 'Answer saved to your notes' : 'Answer removed from your notes');
              } else {
                toast.error('Could not find the question for this answer');
              }
            }
            
            return { 
              ...message, 
              saved: newSavedState 
            };
          }
        }
        return message;
      })
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const closeChat = () => {
    setShowChat(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    "What is the main topic of this podcast?",
    "Can you summarize the key points?",
    "Who are the speakers in this podcast?",
    "List down different sections of this podcast?",
  ];

  return (
    <Card className="w-full glass animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-full mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-pod-dark-blue" />
            <span>Ask Questions</span>
          </div>
          {messages.length > 0 && showChat && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-full hover:bg-slate-700/50"
              onClick={closeChat}
            >
              <X size={14} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {showChat ? (
          messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-full mb-4">
              <MessageSquare size={32} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ask About This Podcast</h3>
            <p className="text-black/70 mb-6 max-w-md">
              Ask any question about the podcast content and get AI-powered answers based on the transcript
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
              {suggestedQuestions.map((q, i) => (
                <Button 
                  key={i}
                  variant="outline" 
                  className="justify-start h-auto py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                  onClick={() => {
                    setShowChat(true);
                    setTimeout(() => handleSuggestedQuestion(q), 100);
                  }}
                  disabled={isLoading}
                >
                  <MessageSquare size={18} className="mr-2 flex-shrink-0 text-white" />
                  <span className="truncate">{q}</span>
                </Button>
              ))}
            </div>
          </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="flex flex-col gap-4 mb-4 px-6">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-lg p-4 animate-fade-in shadow-subtle
                        ${message.role === 'user' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-black'}`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        {message.role === 'user' ? (
                          <div className="flex items-center text-xs text-gray-300 mb-1">
                            YOU
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-pod-dark-gray mb-1">
                            ASSISTANT
                          </div>
                        )}
                      </div>
                      <p className={`${message.role === 'user' ? 'font-medium' : 'text-sm'}`}>
                        {message.content}
                      </p>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-3 mb-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-gray-100"
                              onClick={() => handleFeedback(message.id, 'like')}
                            >
                              <ThumbsUp size={12} className={message.liked ? 'text-green-500' : 'text-gray-400'} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-gray-100"
                              onClick={() => handleFeedback(message.id, 'dislike')}
                            >
                              <ThumbsDown size={12} className={message.disliked ? 'text-red-500' : 'text-gray-400'} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-gray-100"
                              onClick={() => copyToClipboard(message.content)}
                            >
                              <Copy size={12} className="text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-gray-100"
                              onClick={() => handleFeedback(message.id, 'save')}
                            >
                              <Bookmark size={12} className={message.saved ? 'text-pod-dark-blue fill-pod-dark-blue' : 'text-gray-400'} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-full mb-4">
              <MessageSquare size={32} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ask About This Podcast</h3>
            <p className="text-black/70 mb-6 max-w-md">
              Ask any question about the podcast content and get AI-powered answers based on the transcript
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
              {suggestedQuestions.map((q, i) => (
                <Button 
                  key={i}
                  variant="outline" 
                  className="justify-start h-auto py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                  onClick={() => {
                    setShowChat(true);
                    setTimeout(() => handleSuggestedQuestion(q), 100);
                  }}
                  disabled={isLoading}
                >
                  <MessageSquare size={18} className="mr-2 flex-shrink-0 text-white" />
                  <span className="truncate">{q}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mt-auto">
          <div className="flex items-center gap-2 mt-4 px-6">
            <Textarea 
              placeholder="Ask a question about this podcast..." 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow bg-white/900 border-white/800 focus-visible:ring-white/700 text-black min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className={`h-8 w-8 rounded-full ${
                question.trim() 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              disabled={!question.trim() || isLoading}
            >
              <Send size={14} className="text-white" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QASection;
