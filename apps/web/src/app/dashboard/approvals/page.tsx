"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import {
  Check,
  X,
  Clock,
  User,
  Video,
  Phone,
  Loader2,
  AlertTriangle,
  Calendar,
  ClipboardCheck,
} from "lucide-react";

type Booking = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  reason: string | null;
  payment_method: string;
  status: string;
  created_at: string;
};

type SlotInfo = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  mode: string;
};

type BookingWithSlot = Booking & Partial<SlotInfo>;

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  const doctorQuery = useQuery({
    queryKey: ["doctor"],
    queryFn: () => api.get<{ id: string }>("/api/doctors/me"),
    staleTime: 300_000,
  });

  const bookingsQuery = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.get<BookingWithSlot[]>("/api/bookings?status=PENDING_REVIEW"),
    enabled: !!doctorQuery.data,
  });

  const bookings = bookingsQuery.data ?? [];

  const slotsQuery = useQuery({
    queryKey: ["availableSlots", doctorQuery.data?.id],
    queryFn: () => {
      const from = new Date();
      const to = new Date(from);
      to.setDate(to.getDate() + 14);
      return api.get<SlotInfo[]>(
        `/api/slots/available/${doctorQuery.data!.id}?from=${from.toISOString()}&to=${to.toISOString()}`
      );
    },
    enabled: !!activePickerId && !!doctorQuery.data,
    staleTime: 60_000,
  });

  const slotOptions = slotsQuery.data ?? [];

  const approveMutation = useMutation({
    mutationFn: ({ bookingId, paymentMethod }: { bookingId: string; paymentMethod: string }) =>
      paymentMethod === "other" || paymentMethod === "as_agreed"
        ? api.post("/api/bookings/approve-as-agreed", { bookingId })
        : api.post("/api/bookings/approve", { bookingId }),
    onSuccess: () => {
      setMessage({ type: "success", text: "Booking approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to approve booking" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      api.post("/api/bookings/reject", { bookingId, reason }),
    onSuccess: () => {
      setMessage({ type: "success", text: "Booking rejected" });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to reject booking" }),
  });

  const postponeMutation = useMutation({
    mutationFn: ({
      bookingId,
      alternativeSlotIds,
    }: {
      bookingId: string;
      alternativeSlotIds: string[];
    }) => api.post("/api/bookings/postpone", { bookingId, alternativeSlotIds }),
    onSuccess: (_data, variables) => {
      setMessage({ type: "success", text: "Booking postponed, patient will choose new slot" });
      setActivePickerId(null);
      setSelectedSlotIds([]);
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: () => setMessage({ type: "error", text: "Failed to postpone booking" }),
  });

  const isPending = (id: string) =>
    (approveMutation.isPending && approveMutation.variables?.bookingId === id) ||
    (rejectMutation.isPending && rejectMutation.variables?.bookingId === id) ||
    (postponeMutation.isPending && postponeMutation.variables?.bookingId === id);

  if (bookingsQuery.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and confirm pending appointment requests
        </p>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending Requests</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {bookings.length} awaiting review
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending approval requests</p>
              <p className="text-xs mt-1">New bookings will appear here for review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-muted p-2.5">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">{booking.patient_name}</h3>
                        <p className="text-xs text-muted-foreground">{booking.patient_email}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {booking.date
                              ? new Date(
                                  booking.date.split("T")[0] + "T00:00:00"
                                ).toLocaleDateString("en-GB")
                              : "Date TBA"}{" "}
                            at {booking.start_time || "--:--"}
                          </span>
                          {booking.mode === "video" ? (
                            <span className="flex items-center gap-1 text-video-indicator">
                              <Video className="h-3.5 w-3.5" /> Video
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-inperson-indicator">
                              <Phone className="h-3.5 w-3.5" /> In-person
                            </span>
                          )}
                        </div>
                        {booking.reason && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Reason: {booking.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            {booking.payment_method === "card"
                              ? "Card"
                              : booking.payment_method === "other"
                                ? "Other"
                                : "As agreed"}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(booking.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive border-destructive/20 hover:bg-destructive/10"
                          disabled={isPending(booking.id)}
                          onClick={() => {
                            const reason = window.prompt("Reason for rejection:");
                            if (reason !== null) {
                              rejectMutation.mutate({ bookingId: booking.id, reason });
                            }
                          }}
                        >
                          {isPending(booking.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={isPending(booking.id)}
                          onClick={() =>
                            approveMutation.mutate({
                              bookingId: booking.id,
                              paymentMethod: booking.payment_method,
                            })
                          }
                        >
                          {isPending(booking.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Confirm
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        disabled={isPending(booking.id)}
                        onClick={() => {
                          if (activePickerId === booking.id) {
                            setActivePickerId(null);
                          } else {
                            setActivePickerId(booking.id);
                            setSelectedSlotIds([]);
                          }
                        }}
                      >
                        Postpone
                      </Button>
                    </div>
                  </div>
                  {activePickerId === booking.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        Select alternative slots
                      </p>
                      {slotsQuery.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading available slots...
                        </div>
                      ) : slotOptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No available slots found. Create more slots in your schedule first.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {slotOptions.map((slot) => {
                            const slotId = slot.id;
                            return (
                              <label
                                key={slot.id}
                                className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer hover:bg-muted/50 ${
                                  selectedSlotIds.includes(slotId)
                                    ? "border-primary bg-primary/5"
                                    : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSlotIds.includes(slotId)}
                                  onChange={() =>
                                    setSelectedSlotIds((prev) =>
                                      prev.includes(slotId)
                                        ? prev.filter((s) => s !== slotId)
                                        : [...prev, slotId]
                                    )
                                  }
                                  className="h-4 w-4 rounded border-input"
                                />
                                <span>
                                  {new Date(slot.date).toLocaleDateString("en-GB", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                  })}{" "}
                                  {slot.start_time}-{slot.end_time}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={selectedSlotIds.length === 0 || isPending(booking.id)}
                          onClick={() =>
                            postponeMutation.mutate({
                              bookingId: booking.id,
                              alternativeSlotIds: selectedSlotIds,
                            })
                          }
                        >
                          {isPending(booking.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          Confirm Postpone ({selectedSlotIds.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActivePickerId(null);
                            setSelectedSlotIds([]);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
