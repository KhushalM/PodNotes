import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="container mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-black">About PodNotes</h1>
      
      <div className="max-w-3xl mx-auto bg-black backdrop-blur-sm rounded-xl p-8 shadow-xl border border-gray-800 text-gray-300 space-y-5 leading-relaxed">
        <p>
          Podcasts are an incredible source of information, stories, and insights. However, passively listening often means valuable knowledge gets lost or forgotten. <span className="text-white font-semibold">PodNotes</span> aims to change that.
        </p>
        <p>
          Our mission is to transform podcast consumption from a passive listening experience into an active learning and knowledge extraction process. We leverage the power of Artificial Intelligence to help you  <span className="text-white">understand, interact with, and retain</span> information from your favorite podcasts like never before.
        </p>
        <p>
          Whether you're a student, a professional keeping up with industry trends, or just a curious mind, PodNotes provides the tools to transcribe, summarize, query, and organize insights from audio content, 
          making your listening time more productive and meaningful.
        </p>
         <Link 
          to="/" 
          className="block pt-4 font-semibold text-center text-white hover:text-pod-contrast-blue transition-colors duration-200"
         >
          Unlock the full potential of your podcasts with PodNotes.
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
