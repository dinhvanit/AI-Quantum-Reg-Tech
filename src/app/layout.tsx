import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "QuantumRegTech",
  description: "Đánh giá tín nhiệm ESG & tối ưu danh mục ngành F&B Việt Nam – MVP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background print:bg-white">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
