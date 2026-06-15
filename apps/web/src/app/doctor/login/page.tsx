import { Card } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { createClient } from "@web/utils/supabase/server";
import { redirect } from "next/navigation";
import { Stethoscope } from "lucide-react";

async function signInWithPassword(formData: FormData) {
  "use server";
  let email = formData.get("email") as string;
  const password = formData.get("password") as string;
  if (!email || !password) return;

  if (!email.includes("@")) email = `${email}@onlineconsult.com`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/doctor/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export default async function DoctorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Doctor Portal</h1>
            <p className="text-xs text-muted-foreground">Online Consultation</p>
          </div>
        </div>

        <Card className="p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Sign in</h2>
            <p className="text-xs text-muted-foreground">
              Access your dashboard to manage consultations.
            </p>
          </div>

          {error ? (
            <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md border border-destructive/20">
              {error}
            </div>
          ) : null}

          <form action={signInWithPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Username or Email
              </Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="robin"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                minLength={6}
                className="h-9 text-xs"
              />
            </div>
            <Button type="submit" className="w-full text-xs h-9">
              Sign in
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Patient?{" "}
          <a href="/book" className="text-primary underline-offset-4 hover:underline">
            Book a consultation
          </a>
        </p>
      </div>
    </main>
  );
}
