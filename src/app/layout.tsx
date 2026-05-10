import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "نظام إدارة المراكز الطبية",
  description: "منصة احترافية لإدارة المراكز والعيادات والتقارير الشهرية.",
  icons: {
    icon: "/aleppo-eagle.png",
    shortcut: "/aleppo-eagle.png",
    apple: "/aleppo-eagle.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <div
          className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm"
          aria-label="علامة مبرمج النظام"
        >
          مبرمج النظام م. محمد شعبان ريمه
        </div>
      </body>
    </html>
  );
}
