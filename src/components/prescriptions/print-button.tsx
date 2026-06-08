"use client";

import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog (→ "Save as PDF"). Hidden when printing. */
export function PrintButton() {
  const t = useTranslations("prescriptions.detail");
  return (
    <Button size="sm" variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer /> {t("print")}
    </Button>
  );
}
