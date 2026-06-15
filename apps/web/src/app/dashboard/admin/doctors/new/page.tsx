import { Card, CardHeader, CardTitle, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { ArrowLeft, Stethoscope } from "lucide-react";
import Link from "next/link";
import { createDoctor } from "../../../../../lib/actions/admin";

export default async function NewDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Doctor</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a new doctor account</p>
        </div>
      </div>

      {error ? (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md border border-destructive/20">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Doctor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDoctor} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Dr. John Doe"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="doctor@clinic.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="specialty" className="text-sm font-medium text-foreground">
                Specialty
              </label>
              <input
                id="specialty"
                name="specialty"
                type="text"
                placeholder="e.g. Dermatology, Cardiology"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Temporary password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Set a temporary password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                The doctor can change this after signing in. Share this password securely.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                Create Doctor
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/admin">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
