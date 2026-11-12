"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8123";

/**
 * The source document, shown next to what the process read out of it. An AP
 * reviewer's actual job is comparing the two, so the invoice is not hidden
 * behind a filename.
 *
 * Pages are rendered to PNG server-side rather than embedded as a PDF, because
 * inline PDF rendering is inconsistent across browsers and some will download
 * the file instead of displaying it.
 */
export function DocumentPane({ runId, filename }: { runId: string; filename: string }) {
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const [failed, setFailed] = useState(false);

  const pdfHref = `${API_BASE}/api/runs/${runId}/file`;
  const previewSrc = `${API_BASE}/api/runs/${runId}/preview?page=${page}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/runs/${runId}/document`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("no document"))))
      .then((meta: { page_count: number }) => {
        if (cancelled) return;
        if (meta.page_count > 0) setPageCount(meta.page_count);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [runId]);

  return (
    <section className="border border-line bg-paper-raised flex flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 h-10 shrink-0">
        <h2 className="caption">Source document</h2>
        <div className="flex items-center gap-3">
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="caption hover:text-accent disabled:opacity-30 transition-colors"
              >
                &larr;
              </button>
              <span className="caption">
                {page + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="caption hover:text-accent disabled:opacity-30 transition-colors"
              >
                &rarr;
              </button>
            </div>
          )}
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="caption hover:text-accent transition-colors"
          >
            PDF &darr;
          </a>
        </div>
      </header>

      <div className="flex-1 bg-paper-sunken p-4 flex items-start justify-center min-h-[420px]">
        {failed ? (
          <p className="text-sm text-ink-soft self-center">
            The original PDF is no longer on disk for this run.
          </p>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewSrc}
            alt={`Invoice ${filename}, page ${page + 1}`}
            className="max-w-full h-auto shadow-lg"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </section>
  );
}
