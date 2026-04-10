"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/hooks/useAnalysis";

interface ResultsTableProps {
  results: AnalysisResult[];
  onSelectRow?: (result: AnalysisResult) => void;
  selectedIndex?: number;
}

export const ResultsTable = ({
  results,
  onSelectRow,
  selectedIndex,
}: ResultsTableProps) => {
  const [sortBy, setSortBy] = useState<string>("phishing_probability");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const sorted = [...results].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    }
    return sortDir === "desc"
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageResults = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
    setPage(0);
  };

  const SortIcon = ({ column }: { column: string }) => (
    <span className="ml-1 text-white/30">
      {sortBy === column ? (sortDir === "desc" ? "\u2193" : "\u2191") : ""}
    </span>
  );

  const getStatusColor = (prediction: string) =>
    prediction === "Phishing"
      ? "text-red-400 bg-red-500/10"
      : "text-emerald-400 bg-emerald-500/10";

  const getAuthColor = (result: string) => {
    const r = result?.toLowerCase();
    if (r === "pass") return "text-emerald-400";
    if (r === "fail" || r === "softfail") return "text-red-400";
    if (r === "neutral") return "text-amber-400";
    return "text-white/30";
  };

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th
                className="px-4 py-3 text-left text-white/50 font-mono text-xs cursor-pointer hover:text-white/80 transition-colors"
                onClick={() => handleSort("index")}
              >
                # <SortIcon column="index" />
              </th>
              <th
                className="px-4 py-3 text-left text-white/50 font-mono text-xs cursor-pointer hover:text-white/80 transition-colors"
                onClick={() => handleSort("subject")}
              >
                Subject <SortIcon column="subject" />
              </th>
              <th
                className="px-4 py-3 text-left text-white/50 font-mono text-xs cursor-pointer hover:text-white/80 transition-colors"
                onClick={() => handleSort("from_address")}
              >
                From <SortIcon column="from_address" />
              </th>
              <th
                className="px-4 py-3 text-left text-white/50 font-mono text-xs cursor-pointer hover:text-white/80 transition-colors"
                onClick={() => handleSort("prediction")}
              >
                Verdict <SortIcon column="prediction" />
              </th>
              <th
                className="px-4 py-3 text-left text-white/50 font-mono text-xs cursor-pointer hover:text-white/80 transition-colors"
                onClick={() => handleSort("phishing_probability")}
              >
                Risk <SortIcon column="phishing_probability" />
              </th>
              <th className="px-4 py-3 text-left text-white/50 font-mono text-xs">
                SPF
              </th>
              <th className="px-4 py-3 text-left text-white/50 font-mono text-xs">
                DKIM
              </th>
              <th className="px-4 py-3 text-left text-white/50 font-mono text-xs">
                DMARC
              </th>
            </tr>
          </thead>
          <tbody>
            {pageResults.map((result, i) => (
              <motion.tr
                key={result.index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                onClick={() => onSelectRow?.(result)}
                className={cn(
                  "border-b border-white/[0.04] cursor-pointer transition-colors",
                  selectedIndex === result.index
                    ? "bg-cyan-500/[0.08]"
                    : "hover:bg-white/[0.03]"
                )}
              >
                <td className="px-4 py-3 text-white/30 font-mono text-xs">
                  {result.index + 1}
                </td>
                <td className="px-4 py-3 text-white/80 max-w-48 truncate">
                  {result.subject}
                </td>
                <td className="px-4 py-3 text-white/60 max-w-32 truncate font-mono text-xs">
                  {result.from_address}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold",
                      getStatusColor(result.prediction)
                    )}
                  >
                    {result.prediction}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${result.phishing_probability * 100}%`,
                        }}
                        transition={{ duration: 0.5, delay: i * 0.02 }}
                        className={cn(
                          "h-full rounded-full",
                          result.phishing_probability >= 0.7
                            ? "bg-red-400"
                            : result.phishing_probability >= 0.4
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        )}
                      />
                    </div>
                    <span className="text-white/50">
                      {(result.phishing_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-mono text-xs font-bold uppercase",
                    getAuthColor(result.spf_result)
                  )}
                >
                  {result.spf_result}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-mono text-xs font-bold uppercase",
                    getAuthColor(result.dkim_result)
                  )}
                >
                  {result.dkim_result}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-mono text-xs font-bold uppercase",
                    getAuthColor(result.dmarc_result)
                  )}
                >
                  {result.dmarc_result}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-white/30 text-sm font-mono">
            {page * pageSize + 1}-{Math.min((page + 1) * pageSize, results.length)} of{" "}
            {results.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-sm border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-sm border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
