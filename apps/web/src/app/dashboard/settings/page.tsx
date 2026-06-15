"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Checkbox } from "@web/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@web/components/ui/form";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { api } from "@web/utils/api";
import { changePassword } from "@web/lib/actions/admin";
import {
  Loader2,
  Check,
  Save,
  Building2,
  CreditCard,
  Bell,
  ShieldCheck,
  Video,
  Mail,
  HardDrive,
  Stethoscope,
} from "lucide-react";

type DoctorProfile = {
  id: string;
  email: string;
  name: string | null;
  specialty: string | null;
  licence_number: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  practice_phone: string | null;
  language: string;
  dpa_accepted_at: string | null;
  dpa_version: string | null;
};

type PracticeSettings = {
  slotLength: number;
  bufferTime: number;
  consultationFee: number | null;
  videoFee: number | null;
  inPersonFee: number | null;
  cancellationCutoff: number;
  noteTemplate: string;
  noteSections: { name: string; order: number; enabled: boolean }[];
  prescriptionHeader?: {
    name: string;
    specialty: string;
    licenceNumber: string;
    clinicAddress: string;
  };
};

type IntegrationSettings = {
  transcriptionProvider: string;
  emailProvider: string;
  emailFromAddress: string;
  videoProvider: string;
  storageProvider: string;
  storageBucket: string;
  storageRegion: string;
  googleWorkspace: {
    connected: boolean;
    accountEmail: string;
    services: {
      calendar: boolean;
      gmail: boolean;
      drive: boolean;
    };
  };
};

type NotificationPrefs = {
  dailyAgendaTime: string;
  newBookingAlert: boolean;
  noShowAlert: boolean;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [practice, setPractice] = useState<PracticeSettings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationSettings | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);

  const [loading, setLoading] = useState(true);

  const profileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    specialty: z.string().optional(),
    licenceNumber: z.string().optional(),
    clinicName: z.string().optional(),
    clinicAddress: z.string().optional(),
    practicePhone: z.string().optional(),
    language: z.enum(["en", "sk"]),
  });

  const practiceSchema = z.object({
    slotLength: z.coerce.number().min(15, "Min 15 minutes").max(120, "Max 120 minutes"),
    bufferTime: z.coerce.number().min(0).max(30, "Max 30 minutes"),
    consultationFee: z.string().optional(),
    videoFee: z.string().optional(),
    inPersonFee: z.string().optional(),
    cancellationCutoff: z.coerce.number().min(1, "Min 1 hour").max(168, "Max 168 hours"),
  });

  const notifSchema = z.object({
    dailyAgendaTime: z.string().min(1, "Time is required"),
    newBookingAlert: z.boolean(),
    noShowAlert: z.boolean(),
  });

  type ProfileFormValues = z.infer<typeof profileSchema>;
  type PracticeFormValues = z.infer<typeof practiceSchema>;
  type NotifFormValues = z.infer<typeof notifSchema>;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      specialty: "",
      licenceNumber: "",
      clinicName: "",
      clinicAddress: "",
      practicePhone: "",
      language: "en",
    },
  });

  const practiceForm = useForm<PracticeFormValues>({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      slotLength: 30,
      bufferTime: 5,
      consultationFee: "",
      videoFee: "",
      inPersonFee: "",
      cancellationCutoff: 24,
    },
  });

  const notifForm = useForm<NotifFormValues>({
    resolver: zodResolver(notifSchema),
    defaultValues: { dailyAgendaTime: "08:00", newBookingAlert: true, noShowAlert: true },
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPractice, setSavingPractice] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingDpa, setSavingDpa] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [profileData, practiceData, integrationsData, notifData] = await Promise.all([
        api.get<DoctorProfile>("/api/doctors/me"),
        api.get<PracticeSettings>("/api/doctors/me/practice-settings"),
        api.get<IntegrationSettings>("/api/doctors/me/integrations"),
        api.get<NotificationPrefs>("/api/doctors/me/notifications"),
      ]);
      setProfile(profileData);
      setPractice(practiceData);
      setIntegrations(integrationsData);
      setNotifPrefs(notifData);
      profileForm.reset({
        name: profileData.name ?? "",
        specialty: profileData.specialty ?? "",
        licenceNumber: profileData.licence_number ?? "",
        clinicName: profileData.clinic_name ?? "",
        clinicAddress: profileData.clinic_address ?? "",
        practicePhone: profileData.practice_phone ?? "",
        language: profileData.language as "en" | "sk",
      });
      practiceForm.reset({
        slotLength: practiceData.slotLength,
        bufferTime: practiceData.bufferTime,
        consultationFee: practiceData.consultationFee?.toString() ?? "",
        videoFee: practiceData.videoFee?.toString() ?? "",
        inPersonFee: practiceData.inPersonFee?.toString() ?? "",
        cancellationCutoff: practiceData.cancellationCutoff,
      });
      notifForm.reset({
        dailyAgendaTime: notifData.dailyAgendaTime,
        newBookingAlert: notifData.newBookingAlert,
        noShowAlert: notifData.noShowAlert,
      });
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveProfile = async (data: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      const updated = await api.put<DoctorProfile>("/api/doctors/me", {
        name: data.name || undefined,
        specialty: data.specialty || undefined,
        licenceNumber: data.licenceNumber || undefined,
        clinicName: data.clinicName || undefined,
        clinicAddress: data.clinicAddress || undefined,
        practicePhone: data.practicePhone || undefined,
        language: data.language,
      });
      setProfile(updated);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePractice = async (data: PracticeFormValues) => {
    setSavingPractice(true);
    try {
      await api.put("/api/doctors/me/practice-settings", {
        slotLength: data.slotLength,
        bufferTime: data.bufferTime,
        consultationFee: data.consultationFee ? Number(data.consultationFee) : null,
        videoFee: data.videoFee ? Number(data.videoFee) : null,
        inPersonFee: data.inPersonFee ? Number(data.inPersonFee) : null,
        cancellationCutoff: data.cancellationCutoff,
      });
      toast.success("Practice settings updated");
    } catch {
      toast.error("Failed to update practice settings");
    } finally {
      setSavingPractice(false);
    }
  };

  const saveNotifPrefs = async (data: NotifFormValues) => {
    setSavingNotif(true);
    try {
      const updated = await api.put<DoctorProfile>("/api/doctors/me/notifications", data);
      setProfile(updated);
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update notification preferences");
    } finally {
      setSavingNotif(false);
    }
  };

  const acceptDpa = async () => {
    setSavingDpa(true);
    try {
      const updated = await api.post<DoctorProfile>("/api/doctors/me/dpa", { version: "1.0" });
      setProfile(updated);
      toast.success("DPA accepted");
    } catch {
      toast.error("Failed to accept DPA");
    } finally {
      setSavingDpa(false);
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, practice, and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal and practice details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(saveProfile)}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email ?? ""} disabled />
                </div>
                <FormField
                  control={profileForm.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Dermatology" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="licenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Licence Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="clinicAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="practicePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practice Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+421" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sk">Slovak</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4">
                <Button type="submit" size="sm" className="gap-2" disabled={savingProfile}>
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={changePassword} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input name="currentPassword" type="password" required />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input name="newPassword" type="password" required minLength={8} />
            </div>
            <div className="col-span-2">
              <Button type="submit" size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Practice Settings</CardTitle>
              <CardDescription>Slot defaults, fees, and clinical preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...practiceForm}>
            <form onSubmit={practiceForm.handleSubmit(savePractice)}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={practiceForm.control}
                  name="slotLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Slot Length (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={15} max={120} step={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="bufferTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buffer Between Slots (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="consultationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation Fee (EUR)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={0.5} {...field} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="videoFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Fee (EUR)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={0.5} {...field} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="inPersonFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>In-Person Fee (EUR)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={0.5} {...field} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={practiceForm.control}
                  name="cancellationCutoff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cancellation Cutoff (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={168} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4">
                <Button type="submit" size="sm" className="gap-2" disabled={savingPractice}>
                  {savingPractice ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Practice Settings
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Daily agenda and booking alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...notifForm}>
            <form onSubmit={notifForm.handleSubmit(saveNotifPrefs)}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={notifForm.control}
                  name="dailyAgendaTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Agenda Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={notifForm.control}
                  name="newBookingAlert"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3 h-10 mt-6">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label className="text-sm text-foreground">New booking email alert</Label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={notifForm.control}
                  name="noShowAlert"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3 h-10 mt-6">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <Label className="text-sm text-foreground">No-show alert</Label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4">
                <Button type="submit" size="sm" className="gap-2" disabled={savingNotif}>
                  {savingNotif ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connected service providers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {integrations ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Video Provider</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {integrations.videoProvider}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Provider</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {integrations.emailProvider}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Payment</p>
                    <p className="text-xs text-muted-foreground">Stripe (env-configured)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Storage</p>
                    <p className="text-xs text-muted-foreground">
                      {integrations.storageProvider}{" "}
                      {integrations.storageBucket ? `/ ${integrations.storageBucket}` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Google Workspace</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {integrations.googleWorkspace.connected ? (
                      <>
                        <Badge
                          variant="default"
                          className="bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20 hover:bg-status-confirmed/20"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {integrations.googleWorkspace.accountEmail}
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge
                          variant="secondary"
                          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                        >
                          Not Configured
                        </Badge>
                        <button
                          type="button"
                          onClick={async () => {
                            const { createClient } = await import("@web/utils/supabase/client");
                            const supabase = createClient();
                            const {
                              data: { session },
                            } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              toast.error("Not signed in");
                              return;
                            }
                            const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
                            try {
                              const res = await fetch(`${base}/api/google/auth`, {
                                headers: { Authorization: `Bearer ${session.access_token}` },
                              });
                              if (!res.ok) {
                                const text = await res.text();
                                throw new Error(text || `HTTP ${res.status}`);
                              }
                              const data = await res.json();
                              if (data.url) window.location.href = data.url;
                            } catch {
                              toast.error(
                                "Failed to start Google connection. Check Google OAuth env vars are set on the API server."
                              );
                            }
                          }}
                          className="ml-auto text-xs font-medium text-primary hover:underline"
                        >
                          Connect Google Account
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load integration settings</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Data Processing Agreement</CardTitle>
              <CardDescription>
                GDPR compliance — accept the DPA to operate the platform
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profile?.dpa_accepted_at ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-status-confirmed/5">
              <Check className="h-5 w-5 text-status-confirmed" />
              <div>
                <p className="text-sm font-medium text-foreground">DPA Accepted</p>
                <p className="text-xs text-muted-foreground">
                  Version {profile.dpa_version} on{" "}
                  {new Date(profile.dpa_accepted_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Review and accept the Data Processing Agreement to enable patient bookings and data
                processing.
              </p>
              <Button size="sm" className="gap-2" disabled={savingDpa} onClick={acceptDpa}>
                {savingDpa ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Accept DPA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
