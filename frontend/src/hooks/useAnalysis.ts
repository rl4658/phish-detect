"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AnalysisResult {
  index: number;
  subject: string;
  from_address: string;
  from_domain: string;
  reply_to: string;
  prediction: string;
  confidence: number;
  phishing_probability: number;
  legit_probability: number;
  spf_result: string;
  dkim_result: string;
  dmarc_result: string;
  num_urls: number;
  has_attachments: boolean;
  contains_tracking_token: boolean;
  received_origin_ip: string;
  num_received_headers: number;
  x_spam_score: number;
  to_addresses?: string;
  date?: string;
  received_hops?: string[];
  [key: string]: unknown;
}

export interface AnalysisSummary {
  total_emails: number;
  phishing_count: number;
  legit_count: number;
  phishing_percentage: number;
  average_confidence: number;
}

export interface AnalysisState {
  status: "idle" | "uploading" | "pending" | "processing" | "completed" | "error";
  progress: number;
  results: AnalysisResult[] | null;
  summary: AnalysisSummary | null;
  error: string | null;
  fileName: string | null;
  fileType: string | null;
  taskId: string | null;
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    status: "idle",
    progress: 0,
    results: null,
    summary: null,
    error: null,
    fileName: null,
    fileType: null,
    taskId: null,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (taskId: string) => {
      stopPolling();

      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/status/${taskId}`);
          if (!res.ok) {
            throw new Error(`Status check failed: ${res.status}`);
          }

          const data = await res.json();

          if (!mountedRef.current) {
            stopPolling();
            return;
          }

          if (data.status === "completed") {
            stopPolling();
            setState((prev) => ({
              ...prev,
              status: "completed",
              progress: 1,
              results: data.results,
              summary: data.summary,
            }));
          } else if (data.status === "error") {
            stopPolling();
            setState((prev) => ({
              ...prev,
              status: "error",
              error: data.error || "Analysis failed",
            }));
          } else {
            setState((prev) => ({
              ...prev,
              status: data.status as AnalysisState["status"],
              progress: data.progress || 0,
            }));
          }
        } catch (err) {
          stopPolling();
          if (mountedRef.current) {
            setState((prev) => ({
              ...prev,
              status: "error",
              error: err instanceof Error ? err.message : "Polling failed",
            }));
          }
        }
      }, 1500);
    },
    [stopPolling]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setState({
        status: "uploading",
        progress: 0,
        results: null,
        summary: null,
        error: null,
        fileName: file.name,
        fileType: file.name.split(".").pop() || "",
        taskId: null,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/analyze`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.detail || `Upload failed: ${res.status}`
          );
        }

        const data = await res.json();

        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          status: "pending",
          taskId: data.task_id,
        }));

        // Start polling
        pollStatus(data.task_id);
      } catch (err) {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          }));
        }
      }
    },
    [pollStatus]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: "idle",
      progress: 0,
      results: null,
      summary: null,
      error: null,
      fileName: null,
      fileType: null,
      taskId: null,
    });
  }, [stopPolling]);

  return {
    ...state,
    uploadFile,
    reset,
  };
}
