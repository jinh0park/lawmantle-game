import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
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

// <meta name="google-site-verification" content="bdNuUzF3wXs062CXhjZra4tRAnyOUNfFS2_BHwqSVVg" />

export const metadata: Metadata = {
  title: "로맨틀 - 법률 유사도 추측 게임",
  description: "유사도를 통해 오늘의 법률을 추측해보세요!",
  verification: { google: "bdNuUzF3wXs062CXhjZra4tRAnyOUNfFS2_BHwqSVVg" },
  openGraph: {
    title: "로맨틀 - 법률 유사도 추측 게임",
    description: "유사도를 통해 오늘의 법률을 추측해보세요!",
    url: "https://lawmantle.vercel.app",
    siteName: "로맨틀",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div className="px-4">
          <footer className="mx-auto mt-12 text-center p-4 border-t-1 border-gray-200 w-full max-w-2xl">
            <p className="text-sm text-gray-400">
              © 2025 jinh0park. All Rights Reserved.
            </p>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
