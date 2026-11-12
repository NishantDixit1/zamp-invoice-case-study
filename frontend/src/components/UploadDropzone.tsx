"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadInvoice } from "@/lib/api";
import { cacheRun } from "@/lib/runCache";

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF invoices are accepted.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const run = await uploadInvoice(file);
      cacheRun(run);
      router.push(`/runs/${run.id}`);
    } catch {
      setError("Could not start the run. Check the backend is running.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) submitFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex h-full cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-8 text-center transition-colors ${
        isDragging ? "border-accent bg-accent-soft" : "border-line-strong bg-paper-raised hover:border-accent"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) submitFile(file);
        }}
      />
      {isSubmitting ? (
        <p className="caption">Uploading</p>
      ) : (
        <>
          <p className="font-display text-base font-semibold text-ink">
            Drop an invoice PDF
          </p>
          <p className="caption mt-1.5">or click to browse</p>
        </>
      )}
      {error && (
        <p className="mt-3 font-data text-xs" style={{ color: "var(--rejected)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
