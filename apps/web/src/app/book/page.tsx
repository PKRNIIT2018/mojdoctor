"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import { Loader2, User, Building2 } from "lucide-react";

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  clinic_name: string;
  language: string;
  practice_phone: string;
};

export default function BookDoctorPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Doctor[]>("/api/doctors/public")
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 max-w-lg mx-auto">
      <div className="pt-8 pb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Online Consultation</h1>
        <p className="text-sm text-muted-foreground mt-1">Select your doctor</p>
      </div>

      <div className="space-y-3">
        {doctors.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No doctors available</p>
        )}

        {doctors.map((doctor) => (
          <Card
            key={doctor.id}
            tabIndex={0}
            role="button"
            className="cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => router.push(`/book/doctor/${doctor.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/book/doctor/${doctor.id}`);
              }
            }}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{doctor.name || "Doctor"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {doctor.specialty || "General"}
                </p>
                {doctor.clinic_name && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{doctor.clinic_name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
