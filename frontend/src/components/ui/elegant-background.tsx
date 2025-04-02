import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ElegantBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  dotColor?: string;
  dotOpacity?: number;
  lineColor?: string;
  lineOpacity?: number;
  dotCount?: number;
  animated?: boolean;
}

export const ElegantBackground = React.forwardRef<
  HTMLDivElement,
  ElegantBackgroundProps
>(
  (
    {
      className,
      dotColor = "#1E2124",
      dotOpacity = 0.9,
      lineColor = "#1E2124",
      lineOpacity = 0.5,
      dotCount = 100000,
      animated = true,
      ...props
    },
    ref
  ) => {
    // Generate random shapes with seed for consistency
    const seed = 42;
    const random = (min: number, max: number, index: number) => {
      const x = Math.sin(seed + index) * 10000;
      const r = x - Math.floor(x);
      return min + r * (max - min);
    };

    // Generate random dots
    const generateRandomDots = React.useCallback(() => {
      return Array.from({ length: dotCount }, (_, i) => {
        const x = random(5, 95, i * 3.7);
        const y = random(5, 95, i * 5.3);
        const size = random(2, 6, i * 7.1);
        const shape = Math.floor(random(0, 3, i * 11.3)); // 0: circle, 1: square, 2: triangle
        const delay = random(0, 2, i * 13.7);
        
        return { x, y, size, shape, delay };
      });
    }, [dotCount]);

    const [dots, setDots] = React.useState(() => generateRandomDots());

    React.useEffect(() => {
      setDots(generateRandomDots());
    }, [generateRandomDots]);

    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 overflow-hidden -z-10", className)}
        {...props}
      >
        <svg
          className="absolute w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          {/* Flowing wave lines similar to the reference image */}
          <g>
            {Array.from({ length: 30 }, (_, i) => {
              // Create multiple thin lines with gentle curves
              const yPosition = 5 + (i * 3); // Distribute lines more densely
              const amplitude = random(2, 8, i * 13.7); // Smaller amplitude for gentle curves
              const frequency = random(0.5, 1.5, i * 17.3); // Frequency of waves
              const phase = random(0, Math.PI * 2, i * 19.7); // Random phase shift
              const opacity = random(0.3, 0.6, i * 23.5); // Semi-transparent
              const width = random(0.5, 1.5, i * 29.1); // Thinner lines
              
              // Create a path with multiple points to form a wave
              let path = `M0,${yPosition}%`;
              
              // Add points to create a flowing wave
              for (let x = 0; x <= 100; x += 5) {
                const y = yPosition + Math.sin(x * 0.05 * frequency + phase) * amplitude;
                path += ` L${x}%,${y}%`;
              }
              
              return (
                <motion.path
                  key={`wave-${i}`}
                  d={path}
                  stroke="#000000"
                  strokeWidth={width}
                  strokeOpacity={opacity}
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: random(3, 6, i * 31.3),
                    delay: random(0, 2, i * 37.9),
                    ease: "easeInOut",
                  }}
                />
              );
            })}
          </g>

          {/* Random shapes */}
          <g>
            {dots.map((dot, i) => {
              // Render different shapes based on the shape value
              if (dot.shape === 0) {
                // Circle
                return animated ? (
                  <motion.circle
                    key={`dot-${i}`}
                    cx={`${dot.x}%`}
                    cy={`${dot.y}%`}
                    r={dot.size}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [0.8, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      delay: dot.delay,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <circle
                    key={`dot-${i}`}
                    cx={`${dot.x}%`}
                    cy={`${dot.y}%`}
                    r={dot.size}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                  />
                );
              } else if (dot.shape === 1) {
                // Square
                return animated ? (
                  <motion.rect
                    key={`dot-${i}`}
                    x={`${dot.x - dot.size/2}%`}
                    y={`${dot.y - dot.size/2}%`}
                    width={dot.size * 2}
                    height={dot.size * 2}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [0.8, 1.2, 1],
                      rotate: [0, 45, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: dot.delay,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <rect
                    key={`dot-${i}`}
                    x={`${dot.x - dot.size/2}%`}
                    y={`${dot.y - dot.size/2}%`}
                    width={dot.size * 2}
                    height={dot.size * 2}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                  />
                );
              } else {
                // Triangle
                const points = `
                  ${dot.x}%,${dot.y - dot.size}% 
                  ${dot.x - dot.size}%,${dot.y + dot.size}% 
                  ${dot.x + dot.size}%,${dot.y + dot.size}%
                `;
                
                return animated ? (
                  <motion.polygon
                    key={`dot-${i}`}
                    points={points}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [0.8, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      delay: dot.delay,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <polygon
                    key={`dot-${i}`}
                    points={points}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                  />
                );
              }
            })}
          </g>
          
          {/* Subtle curved accent lines */}
          {[1, 2, 3].map((i) => (
            <motion.path
              key={`curve-${i}`}
              d={`M0,${33 * i}% Q50%,${10 * i}% 100%,${40 * i}%`}
              stroke={lineColor}
              strokeWidth="2"
              strokeOpacity={lineOpacity * 0.8}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 3,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>
      </div>
    );
  }
);

ElegantBackground.displayName = "ElegantBackground";
