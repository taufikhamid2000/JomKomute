"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDictionary } from "@/lib/use-dictionary";

// Mobile-only (below md) fixed tab bar. The desktop sidebar covers the same
// destinations. Rendered by components/shell.tsx for signed-in users.
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

const ICONS: Record<string, React.ReactNode> = {
  explore: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  report: (
    <>
      <path d="M12 3.5 21 19H3L12 3.5Z" />
      <path d="M12 10v4M12 16.8v.2" />
    </>
  ),
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.7-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
};

export function BottomTabBar() {
  const { t } = useDictionary();
  const pathname = normalizePath(usePathname());
  const tabs = [
    { href: "/", icon: "explore", label: t.homeScreen.tabExplore },
    { href: "/report", icon: "report", label: t.homeScreen.tabReport },
    { href: "/today", icon: "today", label: t.homeScreen.tabToday },
    { href: "/settings", icon: "profile", label: t.homeScreen.tabProfile },
  ];

  return (
    <nav
      aria-label={t.homeScreen.tabBarLabel}
      className="fixed inset-x-0 bottom-0 z-[1150] border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {tabs.map((tab) => {
          // pathname is normalised above (trailingSlash in production).
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                  active ? "text-[var(--tile-fg)]" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                <span
                  className="flex h-7 w-12 items-center justify-center rounded-full"
                  style={
                    active
                      ? { backgroundColor: "var(--tile-bg)" }
                      : undefined
                  }
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 2.1 : 1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ICONS[tab.icon]}
                  </svg>
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
