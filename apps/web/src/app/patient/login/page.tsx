import { Button } from "@web/components/ui/button";
import { Stethoscope, ArrowRight } from "lucide-react";

export default function PatientLoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto">
          <Stethoscope className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Patient Portal</h1>
          <p className="text-sm text-muted-foreground">
            Patient accounts are coming soon. In the meantime, you can book a consultation directly
            without an account.
          </p>
        </div>
        <Button size="lg" className="w-full gap-2" asChild>
          <a href="/book">
            Book a Consultation
            <ArrowRight className="h-5 w-5" />
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Are you a doctor?{" "}
          <a href="/doctor/login" className="text-primary underline-offset-4 hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </main>
  );
}
