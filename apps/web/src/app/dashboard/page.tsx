"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@web/components/ui/chart";
import {
  Calendar,
  Clock,
  Users,
  ClipboardCheck,
  ChevronRight,
  Video,
  User,
  Phone,
  Loader2,
} from "lucide-react";

type BookingWithSlot = Record<string, unknown> & {
  id: string;
  patient_name: string;
  patient_email: string;
  status: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  mode?: string;
  reason?: string;
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const me = await api.get<{ id: string; name?: string }>("/api/doctors/me");

      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const weekEnd = new Date(from);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [todayRes, pendingRes, allRes, weekRes] = await Promise.all([
        api.get<BookingWithSlot[]>(
          `/api/bookings/range/${me.id}?from=${from.toISOString()}&to=${to.toISOString()}`
        ),
        api.get<BookingWithSlot[]>("/api/bookings?status=PENDING_REVIEW"),
        api.get<BookingWithSlot[]>(`/api/bookings?doctorId=${me.id}`),
        api.get<BookingWithSlot[]>(
          `/api/bookings/range/${me.id}?from=${from.toISOString()}&to=${weekEnd.toISOString()}`
        ),
      ]);

      return {
        profile: me,
        todayBookings: todayRes,
        pendingCount: pendingRes.length,
        totalPatients: new Set(allRes.map((b) => b.patient_email)).size,
        weekBookings: weekRes,
      };
    },
  });

  const chartData = useMemo(() => {
    if (!data?.weekBookings?.length) return [];
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const b of data.weekBookings) {
      const key = (b.date ?? "").slice(0, 10);
      if (key in byDay) byDay[key]!++;
    }
    return Object.entries(byDay).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-GB", { weekday: "short" }),
      appointments: count,
    }));
  }, [data?.weekBookings]);

  const chartConfig = {
    appointments: { label: "Appointments", color: "hsl(var(--primary))" },
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const profile = data?.profile;
  const todayBookings = data?.todayBookings ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const weekBookings = data?.weekBookings ?? [];
  const totalPatients = data?.totalPatients ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good morning{profile?.name ? `, ${profile.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/dashboard/slots">
          <Button size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            Manage Schedule
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/approvals">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                </div>
                <div className="rounded-full bg-muted p-3 text-status-pending">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Today&apos;s Appointments</p>
                <p className="text-2xl font-bold text-foreground">{todayBookings.length}</p>
              </div>
              <div className="rounded-full bg-muted p-3 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Upcoming Week</p>
                <p className="text-2xl font-bold text-foreground">{weekBookings.length}</p>
              </div>
              <div className="rounded-full bg-muted p-3 text-video-indicator">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Link href="/dashboard/patients">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                  <p className="text-2xl font-bold text-foreground">{totalPatients}</p>
                </div>
                <div className="rounded-full bg-muted p-3 text-status-confirmed">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today&apos;s Schedule</CardTitle>
              {todayBookings.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {todayBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-sm font-medium text-muted-foreground w-12 shrink-0">
                        {apt.start_time}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {apt.patient_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apt.mode === "video" ? (
                          <span className="flex items-center gap-1 text-xs text-video-indicator">
                            <Video className="h-3 w-3" /> Video
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-inperson-indicator">
                            <Phone className="h-3 w-3" /> In-person
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            apt.status === "CONFIRMED" || apt.status === "CAPTURED"
                              ? "bg-status-confirmed/10 text-status-confirmed"
                              : apt.status === "PENDING_REVIEW" || apt.status === "AWAITING_CARD"
                                ? "bg-status-pending/10 text-status-pending"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Weekly Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="aspect-[3/1]">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "hsl(var(--muted))" }}
                    />
                    <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/approvals">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <ClipboardCheck className="h-4 w-4 text-status-pending" />
                  Review pending approvals
                  {pendingCount > 0 && (
                    <span className="ml-auto bg-status-pending/10 text-status-pending text-xs font-medium px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/dashboard/slots">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  Set availability
                </Button>
              </Link>
              <Link href="/dashboard/patients">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Users className="h-4 w-4 text-status-confirmed" />
                  View patients
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
