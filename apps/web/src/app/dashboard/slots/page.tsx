"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  RefreshCw,
  Calendar,
  Clock,
  Video,
  Users,
  Check,
  X,
  AlertTriangle,
  Save,
} from "lucide-react";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type SlotRule = {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_between: number;
  mode: string;
  date_range: { from: string; to: string } | null;
  is_active: number;
};

type SlotOverride = {
  id: string;
  doctor_id: string;
  date: string;
};

type RuleForm = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakBetween: number;
  mode: string;
  dateFrom: string;
  dateTo: string;
};

const emptyRuleForm: RuleForm = {
  dayOfWeek: 0,
  startTime: "09:00",
  endTime: "17:00",
  slotDuration: 30,
  breakBetween: 5,
  mode: "video",
  dateFrom: "",
  dateTo: "",
};

export default function SlotsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<SlotRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm);
  const [overrideDate, setOverrideDate] = useState("");
  const [activeTab, setActiveTab] = useState<"rules" | "overrides">("rules");

  const doctorQuery = useQuery({
    queryKey: ["doctor"],
    queryFn: () => api.get<{ id: string }>("/api/doctors/me"),
    staleTime: 300_000,
  });

  const doctorId = doctorQuery.data?.id;

  const rulesQuery = useQuery({
    queryKey: ["slots", "rules", doctorId],
    queryFn: () => api.get<SlotRule[]>(`/api/slots/rules/${doctorId}`),
    enabled: !!doctorId,
  });

  const overridesQuery = useQuery({
    queryKey: ["slots", "overrides", doctorId],
    queryFn: () => api.get<SlotOverride[]>(`/api/slots/overrides/${doctorId}`),
    enabled: !!doctorId,
  });

  const rules = rulesQuery.data ?? [];
  const overrides = overridesQuery.data ?? [];
  const loading = doctorQuery.isLoading || rulesQuery.isLoading || overridesQuery.isLoading;

  const invalidateSlots = () => {
    queryClient.invalidateQueries({ queryKey: ["slots", "rules", doctorId] });
    queryClient.invalidateQueries({ queryKey: ["slots", "overrides", doctorId] });
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post<{ created: number; deleted: number }>(`/api/slots/generate/${doctorId}`, {}),
    onSuccess: (result) => {
      setMessage({
        type: "success",
        text: `Generated ${result.created} slots, cleaned up ${result.deleted}`,
      });
    },
    onError: () => setMessage({ type: "error", text: "Failed to generate slots" }),
  });

  const createRuleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<SlotRule>(`/api/slots/rules?doctorId=${doctorId}`, payload),
    onSuccess: () => {
      setMessage({ type: "success", text: "Rule created" });
      closeRuleForm();
      queryClient.invalidateQueries({ queryKey: ["slots", "rules", doctorId] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to save rule" }),
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: Record<string, unknown> }) =>
      api.put<SlotRule>(`/api/slots/rules/${ruleId}?doctorId=${doctorId}`, payload),
    onSuccess: () => {
      setMessage({ type: "success", text: "Rule updated" });
      closeRuleForm();
      queryClient.invalidateQueries({ queryKey: ["slots", "rules", doctorId] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to update rule" }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/api/slots/rules/${ruleId}`),
    onSuccess: () => {
      setMessage({ type: "success", text: "Rule deleted" });
      queryClient.invalidateQueries({ queryKey: ["slots", "rules", doctorId] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to delete rule" }),
  });

  const addOverrideMutation = useMutation({
    mutationFn: (date: string) =>
      api.post<SlotOverride>(`/api/slots/overrides?doctorId=${doctorId}`, { date }),
    onSuccess: (_data, date) => {
      setOverrideDate("");
      setMessage({ type: "success", text: "Override added for " + date });
      queryClient.invalidateQueries({ queryKey: ["slots", "overrides", doctorId] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to add override" }),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (overrideId: string) => api.delete(`/api/slots/overrides/${overrideId}`),
    onSuccess: () => {
      setMessage({ type: "success", text: "Override removed" });
      queryClient.invalidateQueries({ queryKey: ["slots", "overrides", doctorId] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to remove override" }),
  });

  const openAddRule = () => {
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
    setShowRuleForm(true);
  };

  const openEditRule = (rule: SlotRule) => {
    setEditingRule(rule);
    const range = rule.date_range;
    setRuleForm({
      dayOfWeek: rule.day_of_week,
      startTime: rule.start_time,
      endTime: rule.end_time,
      slotDuration: rule.slot_duration,
      breakBetween: rule.break_between,
      mode: rule.mode,
      dateFrom: range?.from ?? "",
      dateTo: range?.to ?? "",
    });
    setShowRuleForm(true);
  };

  const closeRuleForm = () => {
    setShowRuleForm(false);
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
  };

  const submitRule = () => {
    const payload: Record<string, unknown> = {
      dayOfWeek: ruleForm.dayOfWeek,
      startTime: ruleForm.startTime,
      endTime: ruleForm.endTime,
      slotDuration: ruleForm.slotDuration,
      breakBetween: ruleForm.breakBetween,
      mode: ruleForm.mode,
    };
    if (ruleForm.dateFrom && ruleForm.dateTo) {
      payload.dateRange = { from: ruleForm.dateFrom, to: ruleForm.dateTo };
    }

    if (editingRule) {
      updateRuleMutation.mutate({ ruleId: editingRule.id, payload });
    } else {
      createRuleMutation.mutate(payload);
    }
  };

  const deleteRule = (ruleId: string) => {
    if (!confirm("Delete this recurring rule?")) return;
    deleteRuleMutation.mutate(ruleId);
  };

  const addOverride = () => {
    if (!overrideDate) return;
    addOverrideMutation.mutate(overrideDate);
  };

  const deleteOverride = (overrideId: string) => {
    if (!confirm("Remove this date override?")) return;
    deleteOverrideMutation.mutate(overrideId);
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
          <h1 className="text-2xl font-bold text-foreground">Slot Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure recurring availability and date overrides
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Generate Slots
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

      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Recurring Rules
        </button>
        <button
          onClick={() => setActiveTab("overrides")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "overrides"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Date Overrides
        </button>
      </div>

      {activeTab === "rules" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recurring Rules</CardTitle>
              <CardDescription>
                Define weekly availability patterns for slot generation
              </CardDescription>
            </div>
            <Button size="sm" className="gap-2" onClick={openAddRule}>
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </CardHeader>
          <CardContent>
            {rules.length === 0 && !showRuleForm ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recurring rules configured</p>
                <p className="text-xs mt-1">Add your first rule to define weekly availability</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-2.5">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{DAY_NAMES[rule.day_of_week]}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {rule.start_time} - {rule.end_time}
                          </span>
                          <span>{rule.slot_duration} min slots</span>
                          <span>{rule.break_between} min break</span>
                          <span className="flex items-center gap-1">
                            {rule.mode === "both" ? (
                              <>
                                <Video className="h-3.5 w-3.5" />
                                <Users className="h-3.5 w-3.5" />
                                Both
                              </>
                            ) : rule.mode === "video" ? (
                              <>
                                <Video className="h-3.5 w-3.5" /> Video
                              </>
                            ) : (
                              <>
                                <Users className="h-3.5 w-3.5" /> In-person
                              </>
                            )}
                          </span>
                          {rule.date_range && (
                            <span className="text-xs">
                              {rule.date_range.from} to {rule.date_range.to}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditRule(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showRuleForm && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="font-medium text-foreground mb-4">
                  {editingRule ? "Edit Rule" : "New Rule"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Day of Week</label>
                    <select
                      value={ruleForm.dayOfWeek}
                      onChange={(e) =>
                        setRuleForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {DAY_NAMES.map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Consultation Mode</label>
                    <select
                      value={ruleForm.mode}
                      onChange={(e) => setRuleForm((f) => ({ ...f, mode: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="video">Video</option>
                      <option value="in_person">In-person</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Start Time</label>
                    <input
                      type="time"
                      value={ruleForm.startTime}
                      onChange={(e) => setRuleForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">End Time</label>
                    <input
                      type="time"
                      value={ruleForm.endTime}
                      onChange={(e) => setRuleForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Slot Duration (min)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={120}
                      step={5}
                      value={ruleForm.slotDuration}
                      onChange={(e) =>
                        setRuleForm((f) => ({ ...f, slotDuration: Number(e.target.value) }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Break Between (min)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={ruleForm.breakBetween}
                      onChange={(e) =>
                        setRuleForm((f) => ({ ...f, breakBetween: Number(e.target.value) }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Date Range From (optional)
                    </label>
                    <input
                      type="date"
                      value={ruleForm.dateFrom}
                      onChange={(e) => setRuleForm((f) => ({ ...f, dateFrom: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Date Range To (optional)
                    </label>
                    <input
                      type="date"
                      value={ruleForm.dateTo}
                      onChange={(e) => setRuleForm((f) => ({ ...f, dateTo: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                    onClick={submitRule}
                  >
                    {createRuleMutation.isPending || updateRuleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {editingRule ? "Update" : "Create"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={closeRuleForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "overrides" && (
        <Card>
          <CardHeader>
            <CardTitle>Date Overrides</CardTitle>
            <CardDescription>
              Close availability on specific dates or create exceptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 mb-6 p-4 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date to close</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="gap-2"
                disabled={!overrideDate || addOverrideMutation.isPending}
                onClick={addOverride}
              >
                {addOverrideMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Close Date
              </Button>
            </div>

            {overrides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No date overrides configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overrides.map((ov) => (
                  <div
                    key={ov.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-destructive/10 p-2">
                        <X className="h-4 w-4 text-destructive" />
                      </div>
                      <span className="font-medium text-foreground">
                        {new Date(ov.date.split("T")[0] + "T00:00:00").toLocaleDateString("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteOverride(ov.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
