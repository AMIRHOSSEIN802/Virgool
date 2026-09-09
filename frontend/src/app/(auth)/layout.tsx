import type { ReactNode } from "react";

/**
 * Route group layout for authentication pages (login/OTP, Google callback).
 * Deliberately excludes Header/Footer/MobileNav so the user gets a focused,
 * distraction-free auth experience. (No pathname hacks — this is the proper
 * Next.js layout architecture.)
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="flex-1">{children}</main>;
}
