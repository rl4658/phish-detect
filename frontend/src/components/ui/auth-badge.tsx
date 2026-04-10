"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthBadgeProps {
  protocol: string;
  result: string;
  delay?: number;
}

export const AuthBadge = ({ protocol, result, delay = 0 }: AuthBadgeProps) => {
  const normalizedResult = result?.toLowerCase().trim() || "none";

  const getStyles = () => {
    switch (normalizedResult) {
      case "pass":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30",
          dot: "bg-emerald-400",
          text: "text-emerald-300",
          icon: (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ),
        };
      case "fail":
      case "softfail":
        return {
          bg: "bg-red-500/10 border-red-500/30",
          dot: "bg-red-400",
          text: "text-red-300",
          icon: (
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        };
      case "neutral":
        return {
          bg: "bg-amber-500/10 border-amber-500/30",
          dot: "bg-amber-400",
          text: "text-amber-300",
          icon: (
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
        };
      default:
        return {
          bg: "bg-white/5 border-white/10",
          dot: "bg-white/30",
          text: "text-white/40",
          icon: (
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          ),
        };
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border",
        styles.bg
      )}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm font-mono font-semibold uppercase">
          {protocol}
        </p>
      </div>
      <span
        className={cn(
          "text-xs font-mono font-bold uppercase px-2 py-0.5 rounded",
          styles.text
        )}
      >
        {normalizedResult}
      </span>
    </motion.div>
  );
};
