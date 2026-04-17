"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { FileUpload } from "@/components/ui/file-upload";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { ThreatGauge } from "@/components/ui/threat-gauge";
import { AuthBadge } from "@/components/ui/auth-badge";
import { RouteMap } from "@/components/ui/route-map";
import { ResultsTable } from "@/components/ui/results-table";
import { useAnalysis, type AnalysisResult } from "@/hooks/useAnalysis";


// ─── Stagger animation container ─────────────────────────────
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

export default function Home() {
  const analysis = useAnalysis();
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(
    null
  );

  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const handleFileChange = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setUploadedFile(files[0]); // ← add this line
        analysis.uploadFile(files[0]);
      }
    },
    [analysis]
  );

  const handleExportCSV = useCallback(() => {
    if (!analysis.results || analysis.results.length === 0) return;

    const keys = Object.keys(analysis.results[0]);
    const csvContent = [
      keys.join(","),
      ...analysis.results.map((row) =>
        keys
          .map((k) => {
            let val = (row as any)[k];
            if (val === null || val === undefined) val = "";
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filenameBase = analysis.fileName
      ? analysis.fileName.split(".")[0]
      : "phishdetect";
    link.setAttribute("download", `${filenameBase}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [analysis]);

  const handleEvaluate = useCallback(async () => {
    if (!uploadedFile) return;
    setEvalLoading(true);
    setEvalResult(null);
    setEvalError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      const res = await fetch("http://localhost:8000/evaluate", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Evaluation failed");
      }
      const data = await res.json();
      setEvalResult(data);
    } catch (e: any) {
      setEvalError(e.message);
    } finally {
      setEvalLoading(false);
    }
  }, [uploadedFile]);

  // Pick the first result or selected for detail view
  const detailResult =
    selectedResult || (analysis.results ? analysis.results[0] : null);
  const isSingleResult = analysis.results?.length === 1;

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Background */}
      <BackgroundBeams />

      {/* Animated state transitions */}
      <AnimatePresence mode="wait">
        {/* ─── STATE 1: Hero + Upload ─────────────────────── */}
        {(analysis.status === "idle" || analysis.status === "error") && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative z-10"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/[0.05]">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 text-xs font-mono font-medium tracking-wide">
                  ML-POWERED FORENSIC ANALYSIS
                </span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-5xl md:text-7xl font-bold text-center max-w-4xl leading-tight"
            >
              <span className="text-white">Phishing Detection</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-white/40 text-lg md:text-xl text-center max-w-2xl mt-6 leading-relaxed"
            >
              Upload email files for instant forensic analysis. Our
              RandomForest model inspects SPF, DKIM, DMARC, and 7 other
              behavioral signals to classify threats.
            </motion.p>

            {/* Upload Widget */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="w-full max-w-xl mt-12"
            >
              <FileUpload
                onChange={handleFileChange}
                accept=".csv,.eml"
              />
            </motion.div>

            {/* Error Message */}
            {analysis.status === "error" && analysis.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm max-w-xl w-full text-center"
              >
                {analysis.error}
              </motion.div>
            )}

            {/* Feature badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.7 }}
              className="flex flex-wrap justify-center gap-3 mt-12"
            >
              {[
                "SPF Validation",
                "DKIM Analysis",
                "DMARC Check",
                "URL Scanning",
                "Domain Mismatch",
                "Spam Score",
              ].map((feature) => (
                <div
                  key={feature}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 text-xs font-mono"
                >
                  {feature}
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ─── STATE 2: Processing ────────────────────────── */}
        {(analysis.status === "uploading" ||
          analysis.status === "pending" ||
          analysis.status === "processing") && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative z-10"
          >
            {/* Pulsing Shield */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-white/10 mb-8"
            >
              <svg
                className="w-12 h-12 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </motion.div>

            {/* Status text */}
            <h2 className="text-2xl font-semibold text-white mb-2">
              {analysis.status === "uploading"
                ? "Uploading file..."
                : analysis.status === "pending"
                ? "Initializing analysis..."
                : "Analyzing emails..."}
            </h2>
            <p className="text-white/40 text-sm mb-8">
              {analysis.fileName && (
                <span className="font-mono text-cyan-300/60">
                  {analysis.fileName}
                </span>
              )}
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-md">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      analysis.status === "uploading"
                        ? "30%"
                        : analysis.status === "pending"
                        ? "40%"
                        : `${Math.max(40, analysis.progress * 100)}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-white/30 text-xs font-mono mt-2 text-center">
                {analysis.status === "processing"
                  ? `${Math.round(analysis.progress * 100)}% complete`
                  : "Starting..."}
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── STATE 3: Results Dashboard ─────────────────── */}
        {analysis.status === "completed" && analysis.results && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 relative z-10 px-4 py-8 md:py-12"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Analysis Results
                </h1>
                <p className="text-white/40 mt-1 font-mono text-sm">
                  {analysis.summary?.total_emails} email
                  {analysis.summary?.total_emails !== 1 ? "s" : ""} analyzed
                  {analysis.fileName && (
                    <>
                      {" "}
                      from{" "}
                      <span className="text-cyan-300/60">
                        {analysis.fileName}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportCSV}
                  className="px-5 py-2.5 rounded-xl border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 text-sm font-medium hover:bg-cyan-500/20 transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export CSV
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    analysis.reset();
                    setEvalResult(null);
                    setEvalError("");
                    setUploadedFile(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
                >
                  New Analysis
                </motion.button>
              </div>
            </motion.div>

            {/* Bento Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <BentoGrid className="max-w-7xl mx-auto">
                {/* Threat Score Card */}
                <motion.div variants={staggerItem}>
                  <BentoGridItem
                    title="Threat Assessment"
                    className="flex flex-col items-center justify-center min-h-[280px]"
                  >
                    {detailResult && (
                      <ThreatGauge
                        score={detailResult.phishing_probability}
                        label={detailResult.prediction}
                      />
                    )}
                  </BentoGridItem>
                </motion.div>

                {/* Authentication Panel */}
                <motion.div variants={staggerItem}>
                  <BentoGridItem
                    title="Email Authentication"
                    className="min-h-[280px]"
                  >
                    {detailResult && (
                      <div className="flex flex-col gap-3 mt-2">
                        <AuthBadge
                          protocol="SPF"
                          result={detailResult.spf_result}
                          delay={0.1}
                        />
                        <AuthBadge
                          protocol="DKIM"
                          result={detailResult.dkim_result}
                          delay={0.2}
                        />
                        <AuthBadge
                          protocol="DMARC"
                          result={detailResult.dmarc_result}
                          delay={0.3}
                        />
                      </div>
                    )}
                  </BentoGridItem>
                </motion.div>

                {/* Summary Stats */}
                <motion.div variants={staggerItem}>
                  <BentoGridItem
                    title="Summary"
                    className="min-h-[280px]"
                  >
                    {analysis.summary && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-3xl font-bold text-white font-mono">
                            {analysis.summary.total_emails}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Total Emails
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-500/[0.15]">
                          <p className="text-3xl font-bold text-red-400 font-mono">
                            {analysis.summary.phishing_count}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Phishing
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/[0.15]">
                          <p className="text-3xl font-bold text-emerald-400 font-mono">
                            {analysis.summary.legit_count}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Legitimate
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-3xl font-bold text-white font-mono">
                            {analysis.summary.average_confidence}
                            <span className="text-lg text-white/40">%</span>
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Avg Confidence
                          </p>
                        </div>
                      </div>
                    )}
                  </BentoGridItem>
                </motion.div>

                {/* Email Metadata */}
                <motion.div variants={staggerItem}>
                  <BentoGridItem
                    title="Email Details"
                    colSpan={isSingleResult ? 1 : undefined}
                  >
                    {detailResult && (
                      <div className="space-y-3 mt-2">
                        <MetaRow
                          label="Subject"
                          value={detailResult.subject}
                        />
                        <MetaRow
                          label="From"
                          value={detailResult.from_address}
                          mono
                        />
                        <MetaRow
                          label="Domain"
                          value={detailResult.from_domain}
                          mono
                        />
                        {detailResult.reply_to &&
                          detailResult.reply_to !== "nan" &&
                          detailResult.reply_to !== "" && (
                            <MetaRow
                              label="Reply-To"
                              value={detailResult.reply_to}
                              mono
                              highlight
                            />
                          )}
                        {detailResult.to_addresses &&
                          detailResult.to_addresses !== "N/A" && (
                            <MetaRow
                              label="To"
                              value={detailResult.to_addresses}
                              mono
                            />
                          )}
                      </div>
                    )}
                  </BentoGridItem>
                </motion.div>

                {/* Risk Indicators */}
                <motion.div variants={staggerItem}>
                  <BentoGridItem title="Risk Indicators">
                    {detailResult && (
                      <div className="space-y-3 mt-2">
                        <RiskRow
                          label="URLs in Body"
                          value={detailResult.num_urls}
                          danger={detailResult.num_urls > 0}
                        />
                        <RiskRow
                          label="Attachments"
                          value={
                            detailResult.has_attachments ? "Yes" : "No"
                          }
                          danger={detailResult.has_attachments}
                        />
                        <RiskRow
                          label="Tracking Token"
                          value={
                            detailResult.contains_tracking_token
                              ? "Detected"
                              : "None"
                          }
                          danger={detailResult.contains_tracking_token}
                        />
                        <RiskRow
                          label="Spam Score"
                          value={detailResult.x_spam_score.toFixed(1)}
                          danger={detailResult.x_spam_score > 3}
                        />
                        <RiskRow
                          label="Received Hops"
                          value={detailResult.num_received_headers}
                          danger={false}
                        />
                      </div>
                    )}
                  </BentoGridItem>
                </motion.div>

                {/* Route Map */}
                <motion.div variants={staggerItem}>
                  <BentoGridItem title="Email Route Map">
                    {detailResult && (
                      <RouteMap
                        originIp={detailResult.received_origin_ip}
                        hops={detailResult.num_received_headers}
                        delay={0.5}
                      />
                    )}
                  </BentoGridItem>
                </motion.div>
              </BentoGrid>
            </motion.div>

            {/* Results Table (CSV only, multiple results) */}
            {!isSingleResult && analysis.results.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="max-w-7xl mx-auto mt-8"
              >
                <h2 className="text-white/60 text-xs font-mono uppercase tracking-widest mb-4">
                  All Results
                </h2>
                <ResultsTable
                  results={analysis.results}
                  onSelectRow={(r) => setSelectedResult(r)}
                  selectedIndex={selectedResult?.index}
                />
              </motion.div>
            )}

            {/* ─── Evaluation Section ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="max-w-7xl mx-auto mt-8 mb-8"
            >
              {/* Header + trigger button */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white/60 text-xs font-mono uppercase tracking-widest">
                    Model Accuracy Evaluation
                  </h2>
                   <p className="text-white/20 text-xs mt-1">
                    Automatically evaluated from your uploaded dataset
                  </p>
                </div>
                <button
                  onClick={handleEvaluate}
                  disabled={evalLoading}
                  className="px-5 py-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] text-cyan-300 text-xs font-mono hover:bg-cyan-500/10 transition-all disabled:opacity-40"
                >
                  {evalLoading ? "Evaluating..." : "→ Evaluate Labeled Dataset"}
                </button>
              </div>

              {/* Error */}
              {evalError && (
                <div className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-4">
                  {evalError}
                </div>
              )}

              {/* Results */}
              {evalResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
                >
                  {/* File info */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/[0.06]">
                    <div>
                      <p className="text-white font-medium">{evalResult.file_name}</p>
                      <p className="text-white/30 text-xs font-mono mt-0.5">
                        {evalResult.total_rows.toLocaleString()} rows ·{" "}
                        <span className="text-cyan-400">{evalResult.pipeline}</span>
                      </p>
                    </div>
                    <div className="ml-auto flex gap-3">
                      <div className="px-3 py-1.5 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                        {evalResult.label_distribution.legit.toLocaleString()} Legit
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-red-500/[0.05] border border-red-500/20 text-red-400 text-xs font-mono">
                        {evalResult.label_distribution.phishing.toLocaleString()} Phishing
                      </div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Accuracy", value: `${evalResult.metrics.accuracy}%`, color: "text-white" },
                      { label: "Precision", value: evalResult.metrics.precision.toFixed(4), color: "text-cyan-400" },
                      { label: "Recall", value: evalResult.metrics.recall.toFixed(4), color: "text-blue-400" },
                      { label: "F1 Score", value: evalResult.metrics.f1_score.toFixed(4), color: "text-violet-400" },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center"
                      >
                        <p className="text-white/30 text-xs font-mono uppercase tracking-widest mb-2">
                          {m.label}
                        </p>
                        <p className={`text-2xl font-bold font-mono ${m.color}`}>
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Confusion matrix */}
                  <div>
                    <p className="text-white/30 text-xs font-mono uppercase tracking-widest mb-3">
                      Confusion Matrix
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                      {[
                        { label: "True Negative", value: evalResult.confusion_matrix.tn, color: "text-emerald-400", bg: "bg-emerald-500/[0.05] border-emerald-500/20" },
                        { label: "False Positive", value: evalResult.confusion_matrix.fp, color: "text-red-400",     bg: "bg-red-500/[0.05] border-red-500/20" },
                        { label: "False Negative", value: evalResult.confusion_matrix.fn, color: "text-orange-400", bg: "bg-orange-500/[0.05] border-orange-500/20" },
                        { label: "True Positive",  value: evalResult.confusion_matrix.tp, color: "text-emerald-400", bg: "bg-emerald-500/[0.05] border-emerald-500/20" },
                      ].map((c) => (
                        <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
                          <p className="text-white/30 text-xs font-mono mb-1">{c.label}</p>
                          <p className={`text-2xl font-bold font-mono ${c.color}`}>
                            {c.value.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t border-white/[0.04]">
        <p className="text-white/20 text-xs font-mono">
          PhishDetect v1.0 &mdash; CMPE 279 Project &mdash; RandomForest
          Classifier (10 features, 100K training set)
        </p>
      </footer>
    </main>
  );
}

// ─── Helper Components ──────────────────────────────────────

function MetaRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-white/30 text-xs font-mono w-20 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-sm break-all ${
          mono ? "font-mono text-xs" : ""
        } ${highlight ? "text-amber-300" : "text-white/70"}`}
      >
        {value || "N/A"}
      </span>
    </div>
  );
}

function RiskRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02]">
      <span className="text-white/50 text-sm">{label}</span>
      <span
        className={`text-sm font-mono font-semibold ${
          danger ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
