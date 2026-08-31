import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kế hoạch phát triển bản thân",
  description:
    "Lập kế hoạch và nhận phản hồi hiệu quả cho 4 trụ cột: Công việc, Học tập, Sức khỏe, Nghiên cứu.",
};

export const viewport: Viewport = {
  themeColor: "#0e1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const noFlashTheme = `(function(){try{var t=localStorage.getItem('kh-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
