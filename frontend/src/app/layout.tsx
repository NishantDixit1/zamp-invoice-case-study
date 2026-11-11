import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const displaySans = Space_Grotesk({
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
        <header className="border-b border-line bg-paper-raised/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-[1680px] px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold tracking-tight text-ink">
                PS-1
              </span>
              <span className="font-data text-xs uppercase tracking-widest text-ink-soft">
                Invoice Assignment
              </span>
            </Link>
            <nav className="font-data text-xs uppercase tracking-widest text-ink-soft">
              PDF → Decision
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-[1680px] px-8 py-4 font-data text-[11px] uppercase tracking-widest text-ink-soft">
            Zamp | AI Solutions Associate case study (PS-1)
          </div>
        </footer>
      </body>
    </html>
  );
}
