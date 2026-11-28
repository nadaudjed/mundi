"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Les retours d'action animés ne jouent qu'après le premier geste (voir globals.css).
  useEffect(() => {
    const mark = () => document.documentElement.setAttribute("data-interacted", "");
    window.addEventListener("pointerdown", mark, { once: true, capture: true });
    window.addEventListener("keydown", mark, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", mark, { capture: true });
      window.removeEventListener("keydown", mark, { capture: true });
    };
  }, []);

  const show = useCallback((text: string) => {
    setMessage(text);
    setShown((n) => n + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2400);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+1rem)] z-50 flex justify-center px-4 md:bottom-8"
      >
        {message && (
          <div key={shown} className="motion-rise rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-on-ink">
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
