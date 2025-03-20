
import React, { useState, useRef } from 'react';
import { usePodcast } from '@/context/podcast-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileAudio, Loader2 } from 'lucide-react';

const UploadForm: React.FC = () => {
  const { uploadPodcast, isLoading } = usePodcast();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadPodcast(e.target.files[0]);
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
      uploadPodcast(e.dataTransfer.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className={`p-8 text-center max-w-lg mx-auto animate-fade-in glass ${dragActive ? 'ring-2 ring-pod-blue' : ''}`}>
      <div
        className="border-2 border-dashed border-pod-light-blue rounded-lg p-12 transition-all cursor-pointer hover:bg-pod-gray/40"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <Loader2 size={48} className="text-pod-blue animate-spin" />
              <h3 className="text-xl font-medium">Processing Podcast...</h3>
              <p className="text-pod-dark-gray">
                We're transcribing your podcast and generating insights.
              </p>
            </>
          ) : (
            <>
              <div className="bg-pod-light-blue p-4 rounded-full">
                <FileAudio size={48} className="text-pod-dark-blue" />
              </div>
              <h3 className="text-xl font-medium">Upload Your Podcast</h3>
              <p className="text-pod-dark-gray">
                Drag and drop your audio file here, or click to browse
              </p>
              <div className="chip mt-2">MP3, WAV, M4A formats supported</div>
              
              <Button className="mt-4 btn-primary">
                <Upload size={16} className="mr-2" />
                Upload Podcast
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default UploadForm;
