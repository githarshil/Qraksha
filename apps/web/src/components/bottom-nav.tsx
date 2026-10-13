"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, QrCode, ClockCounterClockwise, User } from "@phosphor-icons/react";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { AIAssistantSheet } from "@/components/ai-assistant-sheet";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{
    className?: string;
    weight?: "bold" | "duotone" | "regular" | "fill" | "light" | "thin";
  }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Verify", href: "/audit/run", icon: QrCode },
  { label: "History", href: "/audit/history", icon: ClockCounterClockwise },
  { label: "Merchant", href: "/settings", icon: User },
];

/**
 * Determines which nav item is active based on current pathname.
 */
function getActiveIndex(pathname: string): number {
  if (pathname === "/dashboard" || pathname === "/") return 0;
  if (pathname.startsWith("/audit/history")) return 2;
  if (
    pathname.startsWith("/audit") ||
    pathname.startsWith("/check") ||
    pathname.startsWith("/verify")
  )
    return 1;
  if (pathname.startsWith("/settings") || pathname.startsWith("/register")) return 3;
  return -1;
}

export function BottomNav() {
  const pathname = usePathname();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Hide bottom nav on admin routes and landing page
  if (pathname.startsWith("/admin") || pathname === "/") {
    return null;
  }

  const activeIndex = getActiveIndex(pathname);

  return (
    <>
      {/* 
        Layout spacer: ensures page content is never hidden behind the floating nav.
        Matches pill height + bottom margins + safe-area insets.
      */}
      <div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Outer floating wrapper anchored to viewport bottom with safe-area insets */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom,0px))] px-3 sm:px-4 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 w-full max-w-md">
          {/* Main Floating Pill Navigation fitting phone width */}
          <nav
            aria-label="Main Navigation"
            className="relative flex-1 flex items-center h-[54px] bg-surface/85 backdrop-blur-xl border border-brand rounded-full shadow-[0_8px_32px_rgba(18,9,7,0.7),0_0_15px_rgba(255,75,31,0.15)] p-1"
          >
            {/* 
              Hardware-accelerated sliding active highlight oval.
              Horizontal oval pill shape transitioning smoothly across columns.
            */}
            <div
              className={`absolute top-1.5 bottom-1.5 left-0 w-1/4 pointer-events-none transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none flex items-center justify-center ${
                activeIndex === -1 ? "opacity-0" : "opacity-100"
              }`}
              style={{
                transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
              }}
              aria-hidden="true"
            >
              <div className="w-[72%] max-w-[62px] h-[34px] sm:h-[36px] rounded-full bg-[rgba(255,75,31,0.22)] backdrop-blur-sm border border-[rgba(255,75,31,0.55)] shadow-[0_0_12px_rgba(255,75,31,0.25)]" />
            </div>

            {/* Nav Items */}
            <div className="grid grid-cols-4 items-center w-full h-full">
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeIndex === index;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    title={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative z-10 flex items-center justify-center w-full h-full min-h-[44px] rounded-full transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                      isActive ? "text-brand" : "text-muted hover:text-text"
                    }`}
                  >
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5" weight="bold" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* AI Assistant Button */}
          <AIAssistantButton
            isOpen={isAssistantOpen}
            onClick={() => setIsAssistantOpen((prev) => !prev)}
          />
        </div>
      </div>

      {/* AI Assistant Placeholder Sheet */}
      <AIAssistantSheet isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
    </>
  );
}
