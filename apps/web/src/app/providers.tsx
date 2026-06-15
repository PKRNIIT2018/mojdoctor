"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@web/components/ui/sonner";
import { SerwistProvider } from "@serwist/next/react";
import { CookieConsent } from "@web/components/cookie-consent";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {process.env.NODE_ENV === "production" ? (
          <SerwistProvider swUrl="/sw.js">
            {children}
            <CookieConsent />
          </SerwistProvider>
        ) : (
          <>
            {children}
            <CookieConsent />
          </>
        )}
        <Toaster richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
