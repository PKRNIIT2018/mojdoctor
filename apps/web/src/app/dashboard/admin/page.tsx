import { Card, CardHeader, CardTitle, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { createAdminClient } from "@web/utils/supabase/server";
import {
  Plus,
  Stethoscope,
  Users,
  CalendarCheck,
  Euro,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Mail,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCharts } from "./admin-charts";

function formatEur(cents: number): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function statusIcon(status: string) {
  switch (status) {
    case "CONFIRMED":
      return <CheckCircle2 className="h-3.5 w-3.5 text-status-confirmed" />;
    case "PENDING_REVIEW":
      return <AlertCircle className="h-3.5 w-3.5 text-status-pending" />;
    case "REJECTED":
    case "CANCELLED_BY_PATIENT":
    case "CANCELLED_BY_DOCTOR":
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case "COMPLETED":
      return <CheckCircle2 className="h-3.5 w-3.5 text-status-completed" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export default async function AdminPage() {
  const admin = createAdminClient();

  const {
    data: { user },
  } = await admin.auth.getUser();
  if (!user?.email) redirect("/dashboard");

  const { data: doctorRecord } = await admin
    .from("doctor")
    .select("role")
    .eq("email", user.email)
    .single();

  if (doctorRecord?.role !== "admin") redirect("/dashboard");

  const [
    { count: doctorCount },
    { count: bookingCount },
    { data: patients },
    { data: bookings },
    { data: capturedPayments },
    { data: recentBookings },
    { data: doctors },
    { data: allBookings },
  ] = await Promise.all([
    admin.from("doctor").select("*", { count: "exact", head: true }),
    admin.from("booking").select("*", { count: "exact", head: true }),
    admin.from("booking").select("patient_email"),
    admin.from("booking").select("status"),
    admin.from("payment").select("amount").eq("status", "captured"),
    admin
      .from("booking")
      .select(
        "id, patient_name, patient_email, status, created_at, doctor_id, doctor:doctor_id(name)"
      )
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("doctor")
      .select("id, name, email, specialty, created_at")
      .order("created_at", { ascending: false }),
    admin.from("booking").select("id, doctor_id, status"),
  ]);

  const uniquePatients = new Set(patients?.map((p) => p.patient_email)).size;
  const totalRevenue = (capturedPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const statusCounts = (bookings ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  const pendingCount = statusCounts["PENDING_REVIEW"] ?? 0;
  const confirmedCount = statusCounts["CONFIRMED"] ?? 0;
  const completedCount = statusCounts["COMPLETED"] ?? 0;

  const bookingCountByDoctor = (allBookings ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.doctor_id] = (acc[b.doctor_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your clinic across all doctors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <Building2 className="h-4 w-4" />
              Doctor View
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/admin/doctors/new">
              <Plus className="h-4 w-4" />
              Add Doctor
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{doctorCount ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active on the platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold">{uniquePatients}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique patient emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-video-indicator" />
              <span className="text-2xl font-bold">{bookingCount ?? 0}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-status-pending" />
                {pendingCount} pending
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-status-confirmed" />
                {confirmedCount} confirmed
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-status-completed" />
                {completedCount} done
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-status-captured" />
              <span className="text-2xl font-bold">{formatEur(totalRevenue)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">From captured payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Bookings</CardTitle>
            {recentBookings && recentBookings.length > 10 && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowUpRight className="h-3 w-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-1">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-full bg-muted p-2 shrink-0">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.patient_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(b.doctor as unknown as { name: string } | null)?.name
                          ? `Dr. ${(b.doctor as unknown as { name: string }).name}`
                          : "—"}{" "}
                        &middot; {b.patient_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-medium">
                        {statusIcon(b.status)}
                        <span
                          className={
                            b.status === "CONFIRMED"
                              ? "text-status-confirmed"
                              : b.status === "COMPLETED"
                                ? "text-status-completed"
                                : b.status === "PENDING_REVIEW"
                                  ? "text-status-pending"
                                  : [
                                        "REJECTED",
                                        "CANCELLED_BY_PATIENT",
                                        "CANCELLED_BY_DOCTOR",
                                      ].includes(b.status)
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                          }
                        >
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(b.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No bookings yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Doctors ({doctors?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {doctors && doctors.length > 0 ? (
              doctors.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{bookingCountByDoctor[d.id] ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">bookings</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Stethoscope className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No doctors yet</p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/admin/doctors/new">
                    <Plus className="h-4 w-4" />
                    Add Doctor
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {Object.entries(statusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 p-3 rounded-lg border">
                  {statusIcon(status)}
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{status.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <AdminCharts />
    </div>
  );
}
