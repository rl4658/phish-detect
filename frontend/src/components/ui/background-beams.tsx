"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const generatePaths = () => {
      const newPaths: string[] = [];
      for (let i = 0; i < 12; i++) {
        const startX = Math.random() * 100;
        const startY = -10;
        const cp1X = Math.random() * 100;
        const cp1Y = 20 + Math.random() * 30;
        const cp2X = Math.random() * 100;
        const cp2Y = 50 + Math.random() * 30;
        const endX = Math.random() * 100;
        const endY = 110;
        newPaths.push(
          `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
        );
      }
      setPaths(newPaths);
    };
    generatePaths();
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beam-gradient-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
            <stop offset="30%" stopColor="rgba(6, 182, 212, 0.3)" />
            <stop offset="70%" stopColor="rgba(34, 211, 238, 0.15)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </linearGradient>
          <linearGradient id="beam-gradient-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0)" />
            <stop offset="30%" stopColor="rgba(139, 92, 246, 0.2)" />
            <stop offset="70%" stopColor="rgba(168, 85, 247, 0.1)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </linearGradient>
        </defs>
        {paths.map((path, i) => (
          <React.Fragment key={i}>
            <path
              d={path}
              stroke={i % 2 === 0 ? "url(#beam-gradient-1)" : "url(#beam-gradient-2)"}
              strokeWidth="0.15"
              strokeOpacity="0.6"
              className="animate-beam"
              style={{
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${8 + Math.random() * 6}s`,
              }}
            />
            {/* Glow effect */}
            <path
              d={path}
              stroke={i % 2 === 0 ? "rgba(6, 182, 212, 0.08)" : "rgba(139, 92, 246, 0.06)"}
              strokeWidth="1"
              className="animate-beam blur-sm"
              style={{
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${8 + Math.random() * 6}s`,
                filter: "blur(2px)",
              }}
            />
          </React.Fragment>
        ))}
      </svg>

      {/* Ambient glow spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
    </div>
  );
};
