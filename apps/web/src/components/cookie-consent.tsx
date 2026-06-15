"use client";

import { useState, useEffect } from "react";
import { Button } from "@web/components/ui/button";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "cookie-consent-v1";

type ConsentChoice = "accepted" | "rejected" | null;

function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (val === "accepted" || val === "rejected") return val;
  return null;
}

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    } else {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setConsent("accepted");
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setConsent("rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-fade-in-up"
    >
      <div className="rounded-xl border bg-background p-4 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Cookie Consent</p>
            <p className="text-xs text-muted-foreground">
              We use essential cookies for authentication and security. Analytics cookies help us
              improve the platform.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-6 w-6"
            onClick={handleReject}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={handleAccept}>
            Accept All
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject}>
            Essential Only
          </Button>
        </div>
      </div>
    </div>
  );
}
