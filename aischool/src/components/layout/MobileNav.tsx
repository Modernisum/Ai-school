"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SITE_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-elevated transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center font-bold text-white">
              V
            </div>
            <span className="font-bold text-lg">{SITE_CONFIG.name}</span>
          </Link>
          <button
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-border mt-auto flex flex-col gap-3">
          <Link href="/get-started" onClick={onClose}>
            <Button variant="primary" size="md" className="w-full">
              Request Access
            </Button>
          </Link>
          <Link href="/#features" onClick={onClose}>
            <Button variant="outline" size="md" className="w-full">
              Explore Features
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}