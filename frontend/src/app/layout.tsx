import type { Metadata } from "next";
import { IBM_Plex_Sans_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// The Plex family was drawn for technical product UI, which is what this is.
const displaySans = IBM_Plex_Sans_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodySans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dataMono = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PS-1 | Invoice Assignment",
  description: "AP invoice processing: PDF to decision, Zamp case study",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${bodySans.variable} ${dataMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-paper font-body text-ink">
        <header className="border-b border-line-strong bg-paper-sunken sticky top-0 z-10">
          <div className="mx-auto max-w-[1680px] px-8 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="font-display text-lg font-semibold tracking-tight text-ink">
                PS-1
              </span>
              <span className="h-4 w-px bg-line-strong" />
              <span className="caption">Invoice Assignment</span>
            </Link>
            <span className="caption">AP Review Console</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-[1680px] px-8 py-3 caption">
            Zamp | AI Solutions Associate case study (PS-1)
          </div>
        </footer>
      </body>
    </html>
  );
}
