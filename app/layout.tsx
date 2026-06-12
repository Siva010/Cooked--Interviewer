import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";

export const metadata: Metadata = {
  title: "Cooked Interviewer — AI Interview Prep",
  description:
    "Get grilled by an AI that actually challenges you. Voice-enabled, adaptive, and brutally honest. Stop memorizing. Start thinking.",
  keywords: ["interview prep", "AI interviewer", "coding interview", "CS fundamentals", "mock interview"],
  openGraph: {
    title: "Cooked Interviewer",
    description: "AI-powered interview prep. Get cooked. Get hired.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('cooked-theme') || 'system';
                if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <div className="animated-bg" />
        <NavBar />
        <main style={{ position: "relative", zIndex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
