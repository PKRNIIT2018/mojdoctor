"use client";

import { useEffect, useState } from "react";
import { Button } from "@web/components/ui/button";
import { LocaleSwitcher } from "@web/components/locale-switcher";
import { Video, MapPin, Shield, Stethoscope, ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import { useTranslation, detectLocale } from "@web/lib/i18n";
import type { Locale } from "@web/lib/i18n";

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "en" || stored === "sk") {
      setLocale(stored);
    } else {
      setLocale(detectLocale());
    }
  }, []);

  const { t } = useTranslation(locale);

  return (
    <main className="min-h-dvh flex flex-col">
      <div className="flex items-center justify-between gap-2 px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">{t("landing.brand")}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/doctor/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("landing.doctorSignIn")}
          </Link>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <LocaleSwitcher />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="max-w-lg w-full space-y-8">
          <div className="animate-fade-in-up">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              {t("landing.brand")}
            </h1>
            <p className="text-base text-muted-foreground mt-2">{t("landing.tagline")}</p>
          </div>

          <div className="space-y-4">
            <div
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <Video className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{t("landing.videoTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("landing.videoDesc")}</p>
              </div>
            </div>
            <div
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{t("landing.inPersonTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("landing.inPersonDesc")}</p>
              </div>
            </div>
            <div
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{t("landing.secureTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("landing.secureDesc")}</p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full gap-2 text-base h-12 animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
            asChild
          >
            <a href="/book">
              {t("landing.bookCta")}
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
