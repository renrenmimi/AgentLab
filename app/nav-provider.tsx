"use client";

// Hands the app router to lib/glossary.tsx, so that a cross-reference in the
// prose ("stop 8") navigates in place instead of reloading the document.

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NavContext } from "@/lib/glossary";

export function NavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const go = useCallback((href: string) => router.push(href), [router]);
  return <NavContext.Provider value={go}>{children}</NavContext.Provider>;
}
