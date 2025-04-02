import React, { useState, useRef } from 'react';
import { usePodcast } from '@/hooks/use-podcast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileAudio, Loader2, Headphones, Clock, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const UploadForm: React.FC = () => {
  const { uploadPodcast, isLoading } = usePodcast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startUploadProcess(e.target.files[0]);
      // Reset the input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startUploadProcess(e.dataTransfer.files[0]);
    }
  };

  const startUploadProcess = (file: File) => {
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
    if (!validTypes.includes(file.type) && 
        !file.name.toLowerCase().endsWith('.mp3') && 
        !file.name.toLowerCase().endsWith('.wav') && 
        !file.name.toLowerCase().endsWith('.m4a')) {
      alert('Please upload a valid audio file (MP3, WAV, or M4A)');
      return;
    }
    
    // Simulate upload progress
    setUploadProgress(0);
    setProcessingStage('uploading');
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessingStage('transcribing');
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    // Start the actual upload
    uploadPodcast(file).then(() => {
      clearInterval(interval);
      setProcessingStage('completed');
      setUploadProgress(100);
      
      // Reset after a delay
      setTimeout(() => {
        setProcessingStage(null);
        setUploadProgress(0);
      }, 2000);
    }).catch((error) => {
      console.error("Upload error:", error);
      clearInterval(interval);
      setProcessingStage('error');
    });
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderProcessingStage = () => {
    switch (processingStage) {
      case 'uploading':
        return (
          <>
            <div className="mb-4">
              <Progress value={uploadProgress} className="h-2 bg-slate-700" />
            </div>
            <Loader2 size={48} className="text-blue-400 animate-spin mb-4" />
            <h3 className="text-xl font-semibold mb-2">Uploading Podcast...</h3>
            <p className="text-white/70">
              {uploadProgress < 100 ? 'Transferring your audio file' : 'Upload complete!'}
            </p>
          </>
        );
      case 'transcribing':
        return (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Processing</span>
                <span>This may take a few minutes</span>
              </div>
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse rounded-full"></div>
              </div>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-full mb-4">
              <Headphones size={48} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transcribing Audio</h3>
            <p className="text-black/70">
              Our AI is converting your podcast to text and identifying speakers
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm">
                <CheckCircle2 size={16} className="text-green-400 mr-2" />
                <span className="text-black/70">Audio uploaded successfully</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock size={16} className="text-yellow-400 mr-2 animate-pulse" />
                <span className="text-black/70">Generating transcript</span>
              </div>
              <div className="flex items-center text-sm text-black/50">
                <Clock size={16} className="mr-2" />
                <span>Creating summary</span>
              </div>
            </div>
          </>
        );
      case 'completed':
        return (
          <>
            <div className="bg-green-500/10 p-4 rounded-full mb-4">
              <CheckCircle2 size={48} className="text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Processing Complete!</h3>
            <p className="text-white/70">
              Your podcast has been successfully processed and is ready to explore
            </p>
          </>
        );
      case 'error':
        return (
          <>
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <div className="text-red-400">❌</div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Failed</h3>
            <p className="text-white/70">
              There was an error processing your podcast. Please try again.
            </p>
            <Button 
              onClick={handleButtonClick} 
              className="mt-4 bg-white/10 hover:bg-white/20 text-white border-none"
            >
              Try Again
            </Button>
          </>
        );
      default:
        return (
          <>
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-full mb-4">
              <FileAudio size={48} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Your Podcast</h3>
            <p className="text-black/70 mb-4">
              Drag and drop your audio file here, or click to browse
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <span className="px-3 py-1 bg-blue-500/10 rounded-full text-blue-400 text-xs font-medium">MP3</span>
              <span className="px-3 py-1 bg-blue-500/10 rounded-full text-blue-400 text-xs font-medium">WAV</span>
              <span className="px-3 py-1 bg-blue-500/10 rounded-full text-blue-400 text-xs font-medium">M4A</span>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-none"
              disabled={isLoading}
            >
              <Upload size={16} className="mr-2" />
              Upload Podcast
            </Button>
          </>
        );
    }
  };

  return (
    <Card 
      className={`p-6 text-center animate-fade-in glass backdrop-blur-sm rounded-xl shadow-xl border ${
        dragActive 
          ? 'border-blue-500/50 ring-2 ring-blue-500/20' 
          : 'border-gray-800'
      }`}
    >
      <div
        className={`rounded-lg p-8 transition-all ${!processingStage ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onDragEnter={!isLoading ? handleDrag : undefined}
        onDragLeave={!isLoading ? handleDrag : undefined}
        onDragOver={!isLoading ? handleDrag : undefined}
        onDrop={!isLoading ? handleDrop : undefined}
        onClick={!isLoading && !processingStage ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/m4a,audio/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center">
          {renderProcessingStage()}
        </div>
      </div>
    </Card>
  );
};

export default UploadForm;
