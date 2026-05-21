import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "選股神器 | 1-20天四指標",
  description: "MA / MACD / KDJ / RSI 綜合短線交易分析",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
