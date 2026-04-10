"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ThreatGaugeProps {
  score: number; // 0 to 1
  label: string;
  size?: number;
}

export const ThreatGauge = ({ score, label, size = 180 }: ThreatGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - animatedScore * circumference;
  const percentage = Math.round(animatedScore * 100);

  // Color based on score
  const getColor = (s: number) => {
    if (s >= 0.7) return { stroke: "#ef4444", text: "text-red-400", bg: "from-red-500/20 to-red-900/20", glow: "shadow-red-500/20" };
    if (s >= 0.4) return { stroke: "#f59e0b", text: "text-amber-400", bg: "from-amber-500/20 to-orange-900/20", glow: "shadow-amber-500/20" };
    return { stroke: "#10b981", text: "text-emerald-400", bg: "from-emerald-500/20 to-green-900/20", glow: "shadow-emerald-500/20" };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Animated arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 8px ${colors.stroke}40)` }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-4xl font-bold font-mono ${colors.text}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {percentage}
          </motion.span>
          <span className="text-white/30 text-xs font-mono">%</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
    </div>
  );
};
