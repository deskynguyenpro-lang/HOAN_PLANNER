"use client";

import type { ReactNode } from "react";
import { useStore } from "@/lib/data/store";

export function LoadedGate({ children }: { children: ReactNode }) {
  const { loaded } = useStore();
  if (!loaded) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-9 w-40 rounded-lg" style={{ background: "var(--chip)" }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl"
              style={{ background: "var(--chip)" }}
            />
          ))}
        </div>
        <div className="h-64 rounded-2xl" style={{ background: "var(--chip)" }} />
      </div>
    );
  }
  return <>{children}</>;
}
