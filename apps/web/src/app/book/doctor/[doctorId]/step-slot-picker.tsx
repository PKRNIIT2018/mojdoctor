"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { CalendarDays, Video, MapPin, Loader2, ChevronDown } from "lucide-react";
import { Slot } from "./use-booking-state";

type Props = {
  slots: Slot[];
  loadingSlots: boolean;
  selectedSlot: Slot | null;
  groupedSlots: Record<string, Slot[]>;
  onSelect: (slot: Slot) => void;
  locale: string;
  t: (path: string) => string;
};

function formatDateCard(dateStr: string, locale: string) {
  const d = new Date(dateStr.split("T")[0] + "T00:00:00");
  const lang = locale === "sk" ? "sk-SK" : "en-GB";
  return {
    weekday: d.toLocaleDateString(lang, { weekday: "short" }),
    day: d.toLocaleDateString(lang, { day: "numeric" }),
    month: d.toLocaleDateString(lang, { month: "short" }),
  };
}

function groupByTime(slots: Slot[]): Record<string, Slot[]> {
  return slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    if (!acc[slot.start_time]) acc[slot.start_time] = [];
    acc[slot.start_time]!.push(slot);
    return acc;
  }, {});
}

export function StepSlotPicker({
  slots,
  loadingSlots,
  selectedSlot,
  groupedSlots,
  onSelect,
  locale,
  t,
}: Props) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  function handleDateClick(date: string) {
    if (expandedDate === date) {
      setExpandedDate(null);
      setSelectedTime(null);
    } else {
      setExpandedDate(date);
      setSelectedTime(null);
    }
  }

  function handleTimeClick(time: string) {
    setSelectedTime(selectedTime === time ? null : time);
  }

  function handleModeSelect(slot: Slot) {
    onSelect(slot);
  }

  if (loadingSlots) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("booking.slot.title")}</CardTitle>
          <CardDescription>{t("booking.slot.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(groupedSlots).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("booking.slot.title")}</CardTitle>
          <CardDescription>{t("booking.slot.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t("booking.slot.noSlots")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dates = Object.keys(groupedSlots);

  const slotsByTime = expandedDate ? groupByTime(groupedSlots[expandedDate] ?? []) : {};
  const modesAtSelectedTime = selectedTime ? (slotsByTime[selectedTime] ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("booking.slot.title")}</CardTitle>
        <CardDescription>{t("booking.slot.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date card grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {dates.map((date) => {
            const { weekday, day, month } = formatDateCard(date, locale);
            const isExpanded = expandedDate === date;
            const hasSelectedSlot = groupedSlots[date]?.some((s) => s.id === selectedSlot?.id);

            return (
              <button
                key={date}
                onClick={() => handleDateClick(date)}
                className={`flex flex-col items-center justify-center gap-0.5 p-3 rounded-xl border transition-all select-none ${
                  isExpanded || hasSelectedSlot
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {weekday}
                </span>
                <span className="text-xl font-bold leading-tight">{day}</span>
                <span className="text-[11px] font-medium">{month}</span>
                {hasSelectedSlot && !isExpanded && (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Time slots for the selected date */}
        {expandedDate && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ChevronDown className="h-4 w-4 text-primary" />
              {(() => {
                const { weekday, day, month } = formatDateCard(expandedDate, locale);
                return `${weekday}, ${day} ${month}`;
              })()}
            </div>

            {/* Time buttons — mode-agnostic */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.keys(slotsByTime).map((time) => {
                const isTimeSelected = selectedTime === time;
                const isBookedTime = slotsByTime[time]?.some((s) => s.id === selectedSlot?.id);

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeClick(time)}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                      isTimeSelected || isBookedTime
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>

            {/* Consultation type prompt */}
            {selectedTime && modesAtSelectedTime.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Choose consultation type
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {modesAtSelectedTime.map((slot) => {
                    const isVideo = slot.mode === "video";
                    const isSelected = selectedSlot?.id === slot.id;

                    return (
                      <button
                        key={slot.id}
                        onClick={() => handleModeSelect(slot)}
                        className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/30 text-foreground"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isSelected ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          {isVideo ? (
                            <Video
                              className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                            />
                          ) : (
                            <MapPin
                              className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                            />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">
                            {isVideo ? "Video Consultation" : "In Person Consultation"}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {isVideo
                              ? "Join from anywhere via video call"
                              : "Visit the clinic in person"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
