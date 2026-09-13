import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NaviOps — Port Congestion Prediction & Operations Optimizer",
  description:
    "Enterprise web-based port operations management platform with real-time congestion monitoring and 72-hour constraint optimization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#FAFAF8] text-[#102A27] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
