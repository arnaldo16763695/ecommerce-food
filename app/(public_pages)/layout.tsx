import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="min-h-svh">{children}</main>
      <Footer />
    </>
  );
}
