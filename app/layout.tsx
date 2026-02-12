import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ThemeProvider } from "../components/theme-provider";

const lexend = localFont({
  src: "/fonts/Lexend-Regular.ttf",
  variable: "--font-lexend",
  weight: "400",
  style: "normal",
});
const cunia = localFont({
  src: "/fonts/Cunia.ttf",
  variable: "--font-cunia",
  weight: "400",
  style: "normal",
});

export const metadata: Metadata = {
  title: "E-Commerce Food",
  description: "E-Commerce Food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lexend.className} ${cunia.className} antialiased bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-slate-200`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-svh">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
