"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, QrCode, ClockCounterClockwise, Gear } from "@phosphor-icons/react";

export function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on admin routes and landing page
  if (pathname.startsWith("/admin") || pathname === "/") {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/dashboard", icon: House },
    { label: "Self-Audit", href: "/audit/run", icon: QrCode },
    { label: "History", href: "/audit/history", icon: ClockCounterClockwise },
    { label: "Settings", href: "/settings", icon: Gear },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex justify-around items-center py-2 px-4 max-w-[480px] mx-auto shadow-md"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              isActive ? "text-primary font-semibold" : "text-muted hover:text-text"
            }`}
          >
            <Icon className="w-5 h-5 mb-1" weight="bold" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
