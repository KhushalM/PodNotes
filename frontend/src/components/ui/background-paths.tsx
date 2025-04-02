import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BackgroundPathsProps extends React.HTMLAttributes<HTMLDivElement> {
  pathClassName?: string;
  pathCount?: number;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  minPathLength?: number;
  maxPathLength?: number;
  minPoints?: number;
  maxPoints?: number;
  seed?: number;
}

export const BackgroundPaths = React.forwardRef<
  HTMLDivElement,
  BackgroundPathsProps
>(
  (
    {
      className,
      pathClassName,
      pathCount = 20,
      pathColor = "currentColor",
      pathWidth = 1,
      pathOpacity = 0.2,
      minPathLength = 100,
      maxPathLength = 500,
      minPoints = 2,
      maxPoints = 5,
      seed = 42,
      ...props
    },
    ref
  ) => {
    // Simple pseudo-random number generator with seed
    const random = (min: number, max: number, index: number) => {
      const x = Math.sin(seed + index) * 10000;
      const r = x - Math.floor(x);
      return min + r * (max - min);
    };

    // Generate a random path with a given number of points
    const generatePath = (index: number) => {
      const points = Math.floor(
        random(minPoints, maxPoints, index * 3 + 0.5)
      );
      const length = random(minPathLength, maxPathLength, index * 5 + 0.7);
      const startX = random(0, 100, index * 7 + 1.1);
      const startY = random(0, 100, index * 11 + 1.3);

      let path = `M ${startX} ${startY}`;
      for (let i = 1; i < points; i++) {
        const x = random(
          Math.max(0, startX - length / 2),
          Math.min(100, startX + length / 2),
          index * 13 + i * 17 + 1.5
        );
        const y = random(
          Math.max(0, startY - length / 2),
          Math.min(100, startY + length / 2),
          index * 19 + i * 23 + 1.7
        );
        path += ` L ${x} ${y}`;
      }
      return path;
    };

    // Generate paths
    const paths = Array.from({ length: pathCount }, (_, i) => generatePath(i));

    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 overflow-hidden -z-10", className)}
        {...props}
      >
        <svg
          className="absolute w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {paths.map((path, i) => (
            <motion.path
              key={i}
              d={path}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: random(2, 5, i * 29 + 2.3),
                delay: random(0, 2, i * 31 + 2.5),
                ease: "easeInOut",
              }}
              className={cn(pathClassName)}
              stroke={pathColor}
              strokeWidth={pathWidth}
              strokeOpacity={pathOpacity}
              fill="none"
            />
          ))}
        </svg>
      </div>
    );
  }
);

BackgroundPaths.displayName = "BackgroundPaths";
