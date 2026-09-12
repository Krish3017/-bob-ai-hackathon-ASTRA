"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("NaviOps Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Component Error Encountered
        </h1>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          An unexpected runtime error occurred while rendering this view. The rest of your operational session remains preserved.
        </p>

        {error?.message && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-left border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Error Diagnostic
            </span>
            <code className="text-xs font-mono text-rose-700 break-words">
              {error.message}
            </code>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Home className="h-4 w-4 text-slate-500" />
            Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
