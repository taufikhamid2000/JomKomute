"use client";

// App-wide success/error toast, mounted once in app/layout.tsx (inside
// AuthGate, which itself stays mounted across client-side navigation) so
// a toast fired right before a router.push() — e.g. route-form.tsx's
// "Route saved" after redirecting to the route's detail page — actually
// survives to be seen on the page it lands on, instead of disappearing
// with whatever component fired it.

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error";
type Toast = { id: string; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timers.current.delete(id);
    }, DURATION_MS);
    timers.current.set(id, timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1400] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto max-w-sm rounded-lg px-4 py-2.5 text-center text-sm font-medium shadow-lg ${
              toast.variant === "error" ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
