"use client";

interface WizardHeaderProps {
  step: number;
  onBack: () => void;
  totalSteps: number;
}

const STEP_LABELS = ["Date && Time", "Your Details", "Payment", "Confirmation"];

export function WizardHeader({ step, onBack, totalSteps }: WizardHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Go back"
      >
        ← Back
      </button>
      <div className="text-sm text-muted-foreground">
        Step {step + 1} of {totalSteps} — {STEP_LABELS[step] ?? ""}
      </div>
    </div>
  );
}
