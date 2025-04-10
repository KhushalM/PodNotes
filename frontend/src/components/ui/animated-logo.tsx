"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedLogoProps {
  className?: string;
  size?: number; // Size for the SVG icon part
}

// Increased default size to 48
export const AnimatedLogo = ({ className, size = 54 }: AnimatedLogoProps) => {
  return (
    // Flex container to align icon and text - Increased spacing
    <div className={`flex items-center space-x-1${className}`}>
      {/* Apply positioning classes directly to the SVG */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24" // Reverted to 24x24 viewBox for more space
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="relative translate-y-1 translate-x-1" // Nudge down and right
      >
        {/* Simplified Headphone Path for 24x24 viewBox */}
        <motion.path
          // New simpler path: Arc band, two rectangular earcups
          d="M8 3a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a6 6 0 1 1 12 0v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1V8a5 5 0 0 0-5-5"
          stroke="currentColor"
          strokeWidth="1.5" // Reverted stroke width
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: 1,
          }}
          transition={{
            pathLength: {
              delay: 0.5, // Start drawing after a short delay
              duration: 4, // Slower drawing duration
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop", // Redraw from the beginning
              repeatDelay: 10, // Wait 10 seconds before redrawing
            },
          }}
        />
      </motion.svg>
      {/* Text part - Increased size */}
      <span className="font-semibold text-3xl">PodNotes</span>
    </div>
  );
};
