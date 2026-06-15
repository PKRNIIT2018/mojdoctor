"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@web/components/ui/chart";
import type { ChartConfig } from "@web/components/ui/chart";

const revenueConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--color-chart-1))" },
} satisfies ChartConfig;

const bookingConfig = {
  bookings: { label: "Bookings", color: "hsl(var(--color-chart-2))" },
} satisfies ChartConfig;

export function AdminCharts() {
  const {
    data: revenueData,
    isLoading: revenueLoading,
    isError: revenueError,
    refetch: refetchRevenue,
  } = useQuery({
    queryKey: ["admin", "revenue-trend"],
    queryFn: () => api.get<{ month: string; revenue: number }[]>("/api/admin/revenue-trend"),
  });

  const {
    data: bookingData,
    isLoading: bookingLoading,
    isError: bookingError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["admin", "booking-trend"],
    queryFn: () => api.get<{ month: string; bookings: number }[]>("/api/admin/booking-trend"),
  });

  if (revenueLoading || bookingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend (12 months)</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Failed to load revenue data</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchRevenue()}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : revenueData?.length ? (
            <ChartContainer config={revenueConfig} className="aspect-[2/1]">
              <LineChart data={revenueData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v: number) => `€${(v / 100).toFixed(0)}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Trend (12 months)</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Failed to load booking data</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBookings()}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : bookingData?.length ? (
            <ChartContainer config={bookingConfig} className="aspect-[2/1]">
              <BarChart data={bookingData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No booking data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
