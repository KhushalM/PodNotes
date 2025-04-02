import { useContext } from 'react';
import { PodcastContext, PodcastContextType } from '@/context/podcast-context-types';

export const usePodcast = (): PodcastContextType => {
  const context = useContext(PodcastContext);
  if (context === undefined) {
    throw new Error('usePodcast must be used within a PodcastProvider');
  }
  return context;
};
