import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhishDetect — AI-Powered Email Forensics",
  description:
    "Advanced phishing detection platform using machine learning to analyze email headers, authentication results, and behavioral patterns. Upload .csv or .eml files for instant forensic analysis.",
  keywords: ["phishing detection", "email security", "machine learning", "forensic analysis", "SPF", "DKIM", "DMARC"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] noise-bg" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
