import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ThemeProvider } from "../components/theme-provider";
import NextTopLoader from 'nextjs-toploader';
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { auth } from "@/auth";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lexend.className} ${cunia.variable}  antialiased bg-slate-50  text-gray-900 dark:bg-slate-900 dark:text-slate-200 `}
      >
        <NextTopLoader showSpinner={false} color="oklch(66.6% 0.179 58.318)" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider session={session}>
            <Header />
            <main className="min-h-svh">{children}</main>
            <Footer />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
