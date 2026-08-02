"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDictionary } from "@/lib/use-dictionary";

export function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useDictionary();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.nav.routes },
    { href: "/new", label: t.nav.addRoute },
    { href: "/settings", label: t.nav.settings },
    { href: "/about", label: t.nav.about },
  ];

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const mql = window.matchMedia("(min-width: 768px)");
    function onMqlChange() {
      if (mql.matches) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    mql.addEventListener("change", onMqlChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      mql.removeEventListener("change", onMqlChange);
    };
  }, [open]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--nav-fg-muted)] transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
          >
            <span className="sr-only">Menu</span>
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <Link href="/" className="text-sm font-semibold text-[var(--nav-fg)]">
            {t.nav.brand}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <div
          aria-hidden={!open}
          className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-200 md:hidden ${
            open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.brand}
          className={`fixed top-14 bottom-0 left-0 z-30 flex w-64 flex-col border-r border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-4 shadow-xl transition-transform duration-200 md:hidden ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="flex flex-1 flex-col gap-1">
            <NavLinks links={navLinks} pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
        </aside>

        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col border-r border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-6 md:flex">
          <nav className="flex flex-1 flex-col gap-1">
            <NavLinks links={navLinks} pathname={pathname} />
          </nav>
        </aside>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function NavLinks({
  links,
  pathname,
  onNavigate,
}: {
  links: { href: string; label: string }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "flex min-h-11 items-center rounded-lg bg-[var(--nav-active-bg)] px-3 text-sm font-medium text-[var(--nav-fg)]"
                : "flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--nav-fg-muted)] transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-fg)]"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
