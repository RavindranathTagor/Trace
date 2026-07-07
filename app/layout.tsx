import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const SITE_URL = "https://thetrace.me";
const TITLE = "Trace, a Company Brain and Guardian for your team";
const DESCRIPTION =
  "Trace gives your company a shared memory: it remembers every decision, warns the moment new work reverses or duplicates one, and feeds that memory to the AI agents your team uses. Powered by a Cognee temporal knowledge graph.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Trace",
  keywords: ["organizational memory", "company brain", "decision intelligence", "AI agents", "knowledge management", "Cognee", "B2B SaaS"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Trace",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/trace-logo-full.png", width: 1200, height: 630, alt: "Trace, a Company Brain and Guardian" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/trace-logo-full.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
