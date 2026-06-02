"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog (→ "Save as PDF"). Hidden when printing. */
export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button size="sm" variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer /> {label}
    </Button>
  );
}
