"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import {
  FormInput,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Check,
  AlertTriangle,
  Save,
  GripVertical,
  X,
} from "lucide-react";

type Question = {
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[];
};

type Template = {
  id: string;
  doctor_id: string;
  title: string;
  description: string | null;
  questions: Question[];
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

const QUESTION_TYPES = ["text", "textarea", "select", "checkbox"] as const;
const EMPTY_QUESTION: Question = { label: "", type: "text", required: false };

export default function IntakePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    isActive: true,
    questions: [EMPTY_QUESTION],
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api.get<Template[]>("/api/intake/templates");
      setTemplates(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load intake forms" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", description: "", isActive: true, questions: [EMPTY_QUESTION] });
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      isActive: t.is_active,
      questions: t.questions.length > 0 ? t.questions : [EMPTY_QUESTION],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ title: "", description: "", isActive: true, questions: [EMPTY_QUESTION] });
  };

  const submit = async () => {
    if (!form.title) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        questions: form.questions.filter((q) => q.label),
        isActive: form.isActive,
      };

      if (editing) {
        const updated = await api.put<Template>(`/api/intake/templates/${editing.id}`, payload);
        setTemplates((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        setMessage({ type: "success", text: "Form updated" });
      } else {
        const created = await api.post<Template>("/api/intake/templates", payload);
        setTemplates((prev) => [...prev, created]);
        setMessage({ type: "success", text: "Form created" });
      }
      closeForm();
    } catch {
      setMessage({ type: "error", text: "Failed to save form" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this intake form?")) return;
    try {
      await api.delete(`/api/intake/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setMessage({ type: "success", text: "Form deleted" });
    } catch {
      setMessage({ type: "error", text: "Failed to delete form" });
    }
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  };

  const removeQuestion = (idx: number) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
    }));
  };

  const addQuestion = () => {
    setForm((f) => ({ ...f, questions: [...f.questions, EMPTY_QUESTION] }));
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
          <h1 className="text-2xl font-bold text-foreground">Intake Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create questionnaires patients fill in before their consultation
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Form
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
          <CardTitle>Forms ({templates.length})</CardTitle>
          <CardDescription>Patient intake questionnaires</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 && !showForm ? (
            <div className="text-center py-12 text-muted-foreground">
              <FormInput className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No intake forms yet</p>
              <p className="text-xs mt-1">
                Create forms to collect patient information before appointments
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start justify-between p-4 rounded-lg border">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                      <FormInput className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{t.title}</p>
                        {t.is_active ? (
                          <span className="rounded-full bg-status-confirmed/10 text-status-confirmed px-2 py-0.5 text-xs">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-md">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {t.questions.length} question{t.questions.length !== 1 ? "s" : ""}
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
                {editing ? "Edit Intake Form" : "New Intake Form"}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title *</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. New Patient Questionnaire"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <select
                      value={form.isActive ? "active" : "inactive"}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isActive: e.target.value === "active" }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this form"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Questions</label>
                    <Button size="sm" variant="outline" className="gap-1" onClick={addQuestion}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Question
                    </Button>
                  </div>
                  {form.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-background"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 mt-2.5" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Label</label>
                          <input
                            value={q.label}
                            onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                            placeholder="Question text"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Type</label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              updateQuestion(idx, { type: e.target.value as Question["type"] })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">&nbsp;</label>
                          <label className="flex items-center gap-2 h-9">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm text-foreground">Required</span>
                          </label>
                        </div>
                      </div>
                      {form.questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(idx)}
                          className="text-destructive hover:text-destructive/80 mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={!form.title || submitting}
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
