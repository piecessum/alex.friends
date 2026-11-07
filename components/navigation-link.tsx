"use client";

import Link, { useLinkStatus } from "next/link";
import { useId, useLayoutEffect, type ComponentProps } from "react";
import { useNavigationState } from "@/components/navigation-state";

// Let Next handle prefetch, history, modified clicks and cancellation. Mirror its
// real transition state so feedback also works before a loading boundary arrives.
function LinkStatus({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  const { report } = useNavigationState();
  const id = useId();
  useLayoutEffect(() => {
    if (!pending) return;
    report(id, href, true);
    return () => report(id, href, false);
  }, [pending, id, href, report]);
  return null;
}

export default function NavigationLink({ children, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const href = typeof props.href === "string" ? props.href : props.href.pathname ?? "/";
  return (
    <Link {...props} onNavigate={event => {
      onNavigate?.(event);
      // Next otherwise refreshes an already-open route. A selected tab should
      // stay put; anchor/query changes still navigate normally.
      if (typeof props.href === "string" && new URL(props.href, window.location.href).href === window.location.href) event.preventDefault();
    }}>
      {children}<LinkStatus href={href} />
    </Link>
  );
}
