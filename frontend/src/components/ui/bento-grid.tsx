"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  children,
  colSpan,
  rowSpan,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6",
        "hover:border-white/[0.15] transition-all duration-300",
        "group/bento overflow-hidden relative",
        colSpan === 2 && "md:col-span-2",
        colSpan === 3 && "lg:col-span-3",
        rowSpan === 2 && "md:row-span-2",
        className
      )}
    >
      {title && (
        <h3 className="text-white/60 text-xs font-mono uppercase tracking-widest mb-3">
          {title}
        </h3>
      )}
      {children}
      {description && (
        <p className="text-white/40 text-sm mt-2">{description}</p>
      )}
    </div>
  );
};
