"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  CalendarDays,
  Users,
  FileText,
} from "lucide-react";

type ComplianceStats = {
  totalBookings: number;
  anonymizedBookings: number;
  activeRecordsWithPII: number;
  oldestRecord: string | null;
  retentionPeriodDays: number;
};

export default function CompliancePage() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [anonymizing, setAnonymizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exportEmail, setExportEmail] = useState("");
  const [erasureEmail, setErasureEmail] = useState("");
  const [retentionDays, setRetentionDays] = useState(365);

  const fetchStats = async () => {
    try {
      const data = await api.get<ComplianceStats>("/api/compliance/stats");
      setStats(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load compliance stats" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAnonymize = async () => {
    setAnonymizing(true);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>("/api/compliance/anonymize", {
        olderThanDays: retentionDays,
      });
      setMessage({ type: "success", text: res.message });
      fetchStats();
    } catch {
      setMessage({ type: "error", text: "Anonymization failed" });
    } finally {
      setAnonymizing(false);
    }
  };

  const handleExport = async () => {
    if (!exportEmail.trim()) return;
    setExporting(true);
    setMessage(null);
    try {
      const data = await api.post("/api/compliance/export", { email: exportEmail });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${exportEmail.replace(/[^a-z0-9]/gi, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Data exported for ${exportEmail}` });
    } catch {
      setMessage({ type: "error", text: "Export failed — no data found for this email" });
    } finally {
      setExporting(false);
    }
  };

  const handleErasure = async () => {
    if (!erasureEmail.trim()) return;
    if (!confirm(`Permanently delete all data for ${erasureEmail}? This cannot be undone.`)) return;
    setErasing(true);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>("/api/compliance/erasure", {
        email: erasureEmail,
      });
      setMessage({ type: "success", text: res.message });
      setErasureEmail("");
    } catch {
      setMessage({ type: "error", text: "Erasure failed — no data found for this email" });
    } finally {
      setErasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance &amp; GDPR
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage data retention, patient data export, and right to erasure
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 text-sm px-4 py-3 rounded-md border ${
            message.type === "success"
              ? "bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">All patient bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-status-confirmed" />
              Active with PII
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.activeRecordsWithPII ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Records containing personal data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-status-pending" />
              Anonymized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.anonymizedBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Records anonymized after retention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Data Retention
          </CardTitle>
          <CardDescription>
            Anonymize patient records older than the specified retention period. PII fields (name,
            email, phone, reason) will be replaced with anonymized values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Retention Period (days)</label>
              <input
                type="number"
                min={30}
                max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              onClick={handleAnonymize}
              disabled={anonymizing}
              variant="outline"
              className="gap-2"
            >
              {anonymizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              {anonymizing ? "Anonymizing..." : "Run Anonymization"}
            </Button>
          </div>
          {stats?.oldestRecord && (
            <p className="text-xs text-muted-foreground">
              Oldest record: {new Date(stats.oldestRecord).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Data Export
            </CardTitle>
            <CardDescription>
              Export all data for a patient (Subject Access Request). Downloads a JSON file with
              bookings, case files, notes, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Patient Email</label>
              <input
                type="email"
                value={exportEmail}
                onChange={(e) => setExportEmail(e.target.value)}
                placeholder="patient@example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || !exportEmail.trim()}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Exporting..." : "Export Data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Right to Erasure
            </CardTitle>
            <CardDescription>
              Permanently delete all data for a patient. This action cannot be undone. Case
              documents will be removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Patient Email</label>
              <input
                type="email"
                value={erasureEmail}
                onChange={(e) => setErasureEmail(e.target.value)}
                placeholder="patient@example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              onClick={handleErasure}
              disabled={erasing || !erasureEmail.trim()}
              variant="destructive"
              className="gap-2"
            >
              {erasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {erasing ? "Deleting..." : "Delete All Data"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
