import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";

/**
 * Route group layout for the main application (feed, blog, profile, admin, search).
 * The root layout provides <html>/<body> + Providers; this layer owns the
 * app chrome: Header, Footer, and mobile bottom navigation. Auth pages
 * ((auth) route group) deliberately render without any of it.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}
