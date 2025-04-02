import React, { useState, useEffect } from 'react';
import { usePodcast } from '@/hooks/use-podcast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Send, Sparkles, ThumbsUp, ThumbsDown, Copy, Bookmark, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { askQuestion } from '@/services/api';

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

  const handleSuggestedQuestion = (q: string) => {
    setQuestion(q);
    // Auto-submit after a short delay
    setTimeout(() => {
      handleSubmit();
    }, 500);
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

  // Suggested questions
  const suggestedQuestions = [
    "What is the main topic of this podcast?",
    "Can you summarize the key points?",
    "Who are the speakers in this podcast?",
    "When was this content created?",
  ];

  return (
    <Card className="w-full overflow-hidden animate-fade-in bg-transparent border-none shadow-none">
      <CardHeader className="pb-3 px-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-green-400" />
            <span>Ask Questions</span>
          </div>
          {messages.length > 0 && showChat && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-full hover:bg-slate-700/50"
              onClick={closeChat}
            >
              <X size={16} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] flex flex-col">
          {!showChat ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-full mb-4">
                <MessageSquare size={32} className="text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ask About This Podcast</h3>
              <p className="text-white/70 mb-6 max-w-md">
                Ask any question about the podcast content and get AI-powered answers based on the transcript
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedQuestions.map((q, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    className="justify-start h-auto py-3 px-4 bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 text-left"
                    onClick={() => {
                      setShowChat(true);
                      handleSuggestedQuestion(q);
                    }}
                  >
                    <MessageSquare size={14} className="mr-2 flex-shrink-0 text-green-400" />
                    <span className="truncate">{q}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-grow overflow-y-auto pr-2 mb-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-full mb-4">
                      <MessageSquare size={32} className="text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Ask About This Podcast</h3>
                    <p className="text-white/70 mb-6 max-w-md">
                      Ask any question about the podcast content and get AI-powered answers based on the transcript
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                      {suggestedQuestions.map((q, i) => (
                        <Button 
                          key={i}
                          variant="outline" 
                          className="justify-start h-auto py-3 px-4 bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 text-left"
                          onClick={() => handleSuggestedQuestion(q)}
                        >
                          <MessageSquare size={14} className="mr-2 flex-shrink-0 text-green-400" />
                          <span className="truncate">{q}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`p-4 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-slate-800/70 border border-slate-700/50 ml-12' 
                          : 'bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 mr-12'
                      }`}
                    >
                      <div className="flex items-start mb-2">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm font-medium flex-shrink-0 ${
                            message.role === 'user' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {message.role === 'user' ? 'Y' : 'A'}
                        </div>
                        <div className="flex-grow">
                          <div className="font-medium text-white">
                            {message.role === 'user' ? 'You' : 'AI Assistant'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        
                        {message.role === 'assistant' && (
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-slate-700/50"
                              onClick={() => copyToClipboard(message.content)}
                            >
                              <Copy size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-7 w-7 rounded-full hover:bg-slate-700/50 ${message.saved ? 'text-yellow-400' : ''}`}
                              onClick={() => handleFeedback(message.id, 'save')}
                            >
                              <Bookmark size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-slate-700/50"
                            >
                              <Share2 size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="pl-10">
                        <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
                          {message.content}
                        </p>
                        
                        {message.role === 'assistant' && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="text-xs text-slate-400 mr-1">Was this helpful?</div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-7 w-7 rounded-full hover:bg-slate-700/50 ${message.liked ? 'text-green-400 bg-green-500/10' : ''}`}
                              onClick={() => handleFeedback(message.id, 'like')}
                            >
                              <ThumbsUp size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-7 w-7 rounded-full hover:bg-slate-700/50 ${message.disliked ? 'text-red-400 bg-red-500/10' : ''}`}
                              onClick={() => handleFeedback(message.id, 'dislike')}
                            >
                              <ThumbsDown size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 mr-12">
                    <div className="flex items-start mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2 text-sm font-medium">
                        <Sparkles size={14} className="text-green-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="font-medium text-white">AI Assistant</div>
                        <div className="text-xs text-slate-400">Thinking...</div>
                      </div>
                    </div>
                    <div className="pl-10">
                      <div className="flex gap-1 items-center">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-bounce"></div>
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="mt-auto">
                <div className="relative">
                  <Textarea 
                    placeholder="Ask a question about this podcast..." 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[60px] resize-none bg-slate-800/50 border-slate-700 focus-visible:ring-green-500 pr-12"
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className={`absolute right-2 bottom-2 h-8 w-8 rounded-full ${
                      question.trim() 
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600' 
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    disabled={!question.trim() || isLoading}
                  >
                    <Send size={14} className="text-white" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QASection;
