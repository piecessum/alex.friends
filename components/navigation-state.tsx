"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Pending = { id: string; href: string } | null;
const NavigationContext = createContext({
  pending: null as Pending,
  report: (_id: string, _href: string, _pending: boolean) => {},
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending>(null);
  const report = useCallback((id: string, href: string, waiting: boolean) => {
    setPending(current => waiting ? { id, href } : current?.id === id ? null : current);
  }, []);
  return <NavigationContext.Provider value={{ pending, report }}>{children}</NavigationContext.Provider>;
}

export const useNavigationState = () => useContext(NavigationContext);
