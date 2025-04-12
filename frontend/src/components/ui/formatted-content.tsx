import React from 'react';

interface FormattedContentProps {
  content: string;
  className?: string;
}

/**
 * A component that formats AI-generated content with proper styling
 * for bullet points, headings, and other formatting elements.
 */
const FormattedContent: React.FC<FormattedContentProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Process the content to apply formatting
  const formatContent = () => {
    // Split content into paragraphs
    const paragraphs = content.split('\n');

    return paragraphs.map((paragraph, index) => {
      // Skip empty paragraphs but preserve spacing
      if (paragraph.trim() === '') {
        return <div key={`empty-${index}`} className="h-2"></div>;
      }

      // Check if this is a main topic (no bullet point but looks like a heading)
      if (!paragraph.trim().startsWith('•') && 
          !paragraph.trim().startsWith('-') && 
          !paragraph.trim().startsWith('*') &&
          paragraph.length < 60 && 
          !paragraph.includes('.')) {
        return (
          <h3 key={`heading-${index}`} className="text-base font-bold my-2 text-pod-dark-blue">
            {paragraph.trim()}
          </h3>
        );
      }

      // Check if this is a main bullet point
      if (paragraph.trim().startsWith('•')) {
        // Process the paragraph to find and format words surrounded by **
        const processedText = processStarredWords(paragraph.trim().substring(1).trim());
        
        return (
          <div key={`bullet-${index}`} className="flex mb-2">
            <span className="mr-2 text-gray-800">•</span>
            <span className="text-gray-800 font-medium">{processedText}</span>
          </div>
        );
      }

      // Check if this is a sub-point with dash
      if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('  -')) {
        // Process the paragraph to find and format words surrounded by **
        const processedText = processStarredWords(paragraph.trim().substring(1).trim());
        
        return (
          <div key={`sub-${index}`} className="flex mb-2 ml-6">
            <span className="mr-2 text-gray-600">-</span>
            <span className="text-gray-600">{processedText}</span>
          </div>
        );
      }

      // Check if this is a sub-point with asterisk
      if (paragraph.trim().startsWith('*')) {
        // Process the paragraph to find and format words surrounded by **
        const processedText = processStarredWords(paragraph.trim().substring(1).trim());
        
        return (
          <div key={`sub-ast-${index}`} className="flex mb-2 ml-6">
            <span className="mr-2 text-gray-600">•</span>
            <span className="text-gray-600">{processedText}</span>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={`para-${index}`} className="mb-2 text-gray-800">
          {processStarredWords(paragraph)}
        </p>
      );
    });
  };

  // Helper function to process text and format words surrounded by **
  const processStarredWords = (text: string) => {
    // Regular expression to find words surrounded by **
    const regex = /\*\*(.*?)\*\*/g;
    
    // If no ** patterns are found, return the original text
    if (!regex.test(text)) {
      return text;
    }
    
    // Reset the regex lastIndex
    regex.lastIndex = 0;
    
    // Split the text by ** markers
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add the text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add the underlined word
      const word = match[1]; // The content between ** markers
      parts.push(
        <span key={`underline-${match.index}`} className="font-medium">
          {word}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return <>{parts}</>;
  };

  return (
    <div className={`formatted-content ${className}`}>
      {formatContent()}
    </div>
  );
};

export default FormattedContent;
