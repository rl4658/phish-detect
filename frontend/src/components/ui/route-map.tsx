"use client";

import React from "react";
import { motion } from "framer-motion";

interface RouteMapProps {
  originIp: string;
  hops?: number;
  delay?: number;
}

export const RouteMap = ({ originIp, hops = 4, delay = 0 }: RouteMapProps) => {
  const nodes = [
    { label: originIp || "Origin", type: "origin" as const },
    ...Array.from({ length: Math.max(0, Math.min(hops, 6) - 2) }, (_, i) => ({
      label: `Relay ${i + 1}`,
      type: "relay" as const,
    })),
    { label: "Inbox", type: "destination" as const },
  ];

  const getNodeColor = (type: string) => {
    switch (type) {
      case "origin":
        return "border-amber-500/50 bg-amber-500/10 text-amber-300";
      case "destination":
        return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
      default:
        return "border-white/20 bg-white/5 text-white/60";
    }
  };

  const getNodeGlow = (type: string) => {
    switch (type) {
      case "origin":
        return "rgba(245, 158, 11, 0.3)";
      case "destination":
        return "rgba(16, 185, 129, 0.3)";
      default:
        return "rgba(255, 255, 255, 0.1)";
    }
  };

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between gap-1 relative">
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            {/* Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: delay + i * 0.15,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="flex flex-col items-center gap-2 z-10"
            >
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center ${getNodeColor(
                  node.type
                )}`}
                style={{
                  boxShadow: `0 0 15px ${getNodeGlow(node.type)}`,
                }}
              >
                {node.type === "origin" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                ) : node.type === "destination" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] md:text-xs text-white/40 font-mono text-center max-w-16 md:max-w-20 truncate">
                {node.label}
              </span>
            </motion.div>

            {/* Connector line with animated dot */}
            {i < nodes.length - 1 && (
              <div className="flex-1 relative h-[2px] mx-1 min-w-4">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: delay + i * 0.15 + 0.1,
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 origin-left"
                />
                <motion.div
                  initial={{ left: "0%" }}
                  animate={{ left: "100%" }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                    delay: delay + i * 0.3 + 0.5,
                    ease: "easeInOut",
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400"
                  style={{
                    boxShadow: "0 0 8px rgba(6, 182, 212, 0.6)",
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
