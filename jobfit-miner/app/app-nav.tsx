"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Miner" },
  { href: "/jobs", label: "Jobs" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="text-base font-extrabold text-stone-900">JobFit Miner</div>
          <div className="text-xs text-stone-500">Mine jobs and review saved roles</div>
        </div>
        <nav className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
