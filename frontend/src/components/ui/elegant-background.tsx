import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ElegantBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  dotColor?: string;
  dotOpacity?: number;
  lineColor?: string;
  lineOpacity?: number;
  shapeCount?: number;
  lineCount?: number;
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
      dotOpacity = 0.15,
      lineColor = "#1E2124",
      lineOpacity = 0.1,
      shapeCount = 100,
      lineCount = 15,
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

    // Format number to fixed decimal places to ensure valid SVG path syntax
    const formatNumber = (num: number): string => {
      return num.toFixed(2);
    };

    // Generate slanted flowing lines from bottom left to top right
    const generateSlantedLines = React.useCallback(() => {
      return Array.from({ length: lineCount }, (_, i) => {
        // Create slanted lines from bottom left to top right
        const startX = random(-20, 30, i * 13.7); // Start left of the viewport
        const startY = random(70, 120, i * 17.3); // Start near bottom
        const endX = random(70, 120, i * 19.7); // End right of the viewport
        const endY = random(-20, 30, i * 23.5); // End near top
        
        // Control points for curve
        const ctrl1X = random(20, 40, i * 29.1);
        const ctrl1Y = random(50, 70, i * 31.3);
        const ctrl2X = random(60, 80, i * 37.9);
        const ctrl2Y = random(30, 50, i * 41.7);
        
        // Create a curved path
        const path = `M${formatNumber(startX)},${formatNumber(startY)} C${formatNumber(ctrl1X)},${formatNumber(ctrl1Y)} ${formatNumber(ctrl2X)},${formatNumber(ctrl2Y)} ${formatNumber(endX)},${formatNumber(endY)}`;
        
        const opacity = random(0.05, 0.15, i * 43.5);
        const width = random(0.1, 0.4, i * 47.1);
        
        return { 
          path, 
          width, 
          opacity, 
          duration: random(5, 10, i * 53.3), 
          delay: random(0, 3, i * 59.9) 
        };
      });
    }, [lineCount]);

    // Generate multiple shape types
    const generateShapes = React.useCallback(() => {
      return Array.from({ length: shapeCount }, (_, i) => {
        const x = random(5, 95, i * 3.7);
        const y = random(5, 95, i * 4.3);
        const size = random(0.2, 0.8, i * 7.1);
        const delay = random(0, 2, i * 13.7);
        const shape = Math.floor(random(0, 3, i * 11.3)); // 0: circle, 1: square, 2: triangle
        
        return { x, y, size, delay, shape };
      });
    }, [shapeCount]);

    const [shapes, setShapes] = React.useState(() => generateShapes());
    const [lines, setLines] = React.useState(() => generateSlantedLines());

    React.useEffect(() => {
      setShapes(generateShapes());
      setLines(generateSlantedLines());
    }, [generateShapes, generateSlantedLines]);

    // Function to generate triangle points without percent signs
    const getTrianglePoints = (x, y, size) => {
      return `${formatNumber(x)},${formatNumber(y-size)} ${formatNumber(x-size)},${formatNumber(y+size)} ${formatNumber(x+size)},${formatNumber(y+size)}`;
    };

    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 overflow-hidden -z-10", className)}
        style={{ backgroundColor: 'transparent' }}
        {...props}
      >
        <svg
          className="absolute w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Slanted flowing lines */}
          <g>
            {lines.map((line, i) => (
              <motion.path
                key={`line-${i}`}
                d={line.path}
                stroke={lineColor}
                strokeWidth={line.width}
                strokeOpacity={line.opacity}
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: line.duration,
                  delay: line.delay,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop",
                  repeatDelay: 2,
                }}
              />
            ))}
          </g>

          {/* Multiple shape types */}
          <g>
            {shapes.map((shape, i) => {
              if (shape.shape === 0) {
                // Circle
                return animated ? (
                  <motion.circle
                    key={`shape-${i}`}
                    cx={formatNumber(shape.x)}
                    cy={formatNumber(shape.y)}
                    r={formatNumber(shape.size)}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [0.8, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      delay: shape.delay,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <circle
                    key={`shape-${i}`}
                    cx={formatNumber(shape.x)}
                    cy={formatNumber(shape.y)}
                    r={formatNumber(shape.size)}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                  />
                );
              } else if (shape.shape === 1) {
                // Square
                return animated ? (
                  <motion.rect
                    key={`shape-${i}`}
                    x={formatNumber(shape.x - shape.size)}
                    y={formatNumber(shape.y - shape.size)}
                    width={formatNumber(shape.size * 2)}
                    height={formatNumber(shape.size * 2)}
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
                      delay: shape.delay,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <rect
                    key={`shape-${i}`}
                    x={formatNumber(shape.x - shape.size)}
                    y={formatNumber(shape.y - shape.size)}
                    width={formatNumber(shape.size * 2)}
                    height={formatNumber(shape.size * 2)}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                  />
                );
              } else {
                // Triangle - with properly formatted points
                const points = getTrianglePoints(shape.x, shape.y, shape.size);
                
                return animated ? (
                  <motion.polygon
                    key={`shape-${i}`}
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
                      delay: shape.delay,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <polygon
                    key={`shape-${i}`}
                    points={points}
                    fill={dotColor}
                    fillOpacity={dotOpacity}
                  />
                );
              }
            })}
          </g>
        </svg>
      </div>
    );
  }
);

ElegantBackground.displayName = "ElegantBackground";
