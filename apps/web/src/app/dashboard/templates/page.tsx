"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Save,
  Mail,
} from "lucide-react";

type Template = {
  id: string;
  doctor_id: string;
  name: string;
  subject: string | null;
  body_markdown: string | null;
  event: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
};

const EVENTS: { value: string; label: string; vars: string[] }[] = [
  { value: "", label: "— None (manual send only) —", vars: [] },
  {
    value: "booking_confirmation",
    label: "Booking Confirmation",
    vars: ["patient_name", "date", "time", "booking_id", "clinic_name", "mode"],
  },
  {
    value: "booking_approved",
    label: "Booking Approved",
    vars: ["patient_name", "date", "time", "booking_id", "clinic_name", "mode"],
  },
  {
    value: "booking_rejected",
    label: "Booking Rejected",
    vars: ["patient_name", "booking_id", "reason"],
  },
  {
    value: "reminder",
    label: "Appointment Reminder",
    vars: ["patient_name", "date", "time", "booking_id", "mode", "video_room_url"],
  },
  {
    value: "intake",
    label: "Pre-Consult Intake",
    vars: ["patient_name", "date", "time", "booking_id", "intake_url"],
  },
  {
    value: "cancellation",
    label: "Cancellation",
    vars: ["patient_name", "date", "time", "booking_id", "clinic_name", "cancelled_by"],
  },
];

const EVENT_LABELS: Record<string, string> = Object.fromEntries(
  EVENTS.map((e) => [e.value, e.label])
);

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    bodyMarkdown: "",
    event: "",
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api.get<Template[]>("/api/notifications/templates");
      setTemplates(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load templates" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", subject: "", bodyMarkdown: "", event: "", isDefault: false });
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      subject: t.subject ?? "",
      bodyMarkdown: t.body_markdown ?? "",
      event: t.event ?? "",
      isDefault: t.is_default,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", subject: "", bodyMarkdown: "", event: "", isDefault: false });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        subject: form.subject || undefined,
        bodyMarkdown: form.bodyMarkdown || undefined,
        event: form.event || undefined,
        isDefault: form.isDefault,
      };

      if (editing) {
        const updated = await api.put<Template>(
          `/api/notifications/templates/${editing.id}`,
          payload
        );
        setTemplates((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        setMessage({ type: "success", text: "Template updated" });
      } else {
        const created = await api.post<Template>("/api/notifications/templates", payload);
        setTemplates((prev) => [...prev, created]);
        setMessage({ type: "success", text: "Template created" });
      }
      closeForm();
    } catch {
      setMessage({ type: "error", text: "Failed to save template" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await api.delete(`/api/notifications/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setMessage({ type: "success", text: "Template deleted" });
    } catch {
      setMessage({ type: "error", text: "Failed to delete template" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Message Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage email and notification templates
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
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
            <Check className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
          <CardDescription>
            Email subject lines and body content for automated messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 && !showForm ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No message templates yet</p>
              <p className="text-xs mt-1">Create templates to customise automated emails</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start justify-between p-4 rounded-lg border">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{t.name}</p>
                        {t.is_default && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Default
                          </span>
                        )}
                      </div>
                      {t.subject && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-md">
                          {t.subject}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {EVENT_LABELS[t.event ?? ""] || t.event}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(t)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/30">
              <h3 className="font-medium text-foreground mb-4">
                {editing ? "Edit Template" : "New Template"}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Name *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Booking Confirmation EN/SK"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Trigger event</label>
                    <select
                      value={form.event}
                      onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {EVENTS.map((ev) => (
                        <option key={ev.value} value={ev.value}>
                          {ev.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available variables for the chosen event */}
                {form.event &&
                  (() => {
                    const evVars = EVENTS.find((e) => e.value === form.event)?.vars ?? [];
                    return evVars.length > 0 ? (
                      <div className="rounded-md border bg-muted/20 px-3 py-2.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Available variables — click to insert:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {evVars.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  bodyMarkdown: f.bodyMarkdown + `{{${v}}}`,
                                }))
                              }
                              className="px-2 py-0.5 text-xs rounded-md border bg-background hover:bg-primary/5 hover:border-primary/40 text-muted-foreground font-mono transition-colors"
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Subject line</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="e.g. Booking Confirmation | Potvrdenie rezervácie | {{booking_id}}"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Body{" "}
                      <span className="text-muted-foreground font-normal">
                        (HTML or plain text)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPreview((p) => !p)}
                      className="text-xs text-primary hover:underline"
                    >
                      {showPreview ? "Hide preview" : "Preview HTML"}
                    </button>
                  </div>
                  <textarea
                    value={form.bodyMarkdown}
                    onChange={(e) => setForm((f) => ({ ...f, bodyMarkdown: e.target.value }))}
                    placeholder={
                      "Paste your HTML template here.\nUse {{variable}} placeholders, e.g. {{patient_name}}, {{date}}, {{booking_id}}"
                    }
                    rows={14}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm text-foreground">Use as default for this event</span>
                  </label>
                </div>

                {showPreview && form.bodyMarkdown && (
                  <div className="rounded-lg border overflow-hidden">
                    <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                      HTML Preview (variables shown as-is)
                    </p>
                    <iframe
                      srcDoc={form.bodyMarkdown}
                      title="Template preview"
                      className="w-full h-[400px] border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={!form.name || submitting}
                  onClick={submit}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? "Update" : "Create"}
                </Button>
                <Button size="sm" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <div className="flex-1" />
                {editing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={sendingTest}
                    onClick={async () => {
                      setSendingTest(true);
                      try {
                        await api.post("/api/notifications/send", {
                          to: editing ? "test@example.com" : "test@example.com",
                          subject: form.subject || "Test — " + form.name,
                          body: form.bodyMarkdown || "(empty body)",
                        });
                        setMessage({ type: "success", text: "Test email sent" });
                      } catch {
                        setMessage({
                          type: "error",
                          text: "Failed to send test. Connect your Google account in Settings first.",
                        });
                      } finally {
                        setSendingTest(false);
                      }
                    }}
                  >
                    {sendingTest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Test
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
