"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type View = "day" | "week" | "month";

export function ViewSwitcher({
  view,
  date,
  prevDate,
  nextDate,
  todayDate,
  label,
}: {
  view: View;
  date: string;
  prevDate: string;
  nextDate: string;
  todayDate: string;
  label: string;
}) {
  const t = useTranslations("appointments");
  const router = useRouter();
  const go = (v: View, d: string) => router.push(`/appointments?view=${v}&date=${d}`);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(view, prevDate)}>←</Button>
        <Button variant="outline" size="sm" onClick={() => go(view, todayDate)}>{t("today")}</Button>
        <Button variant="outline" size="sm" onClick={() => go(view, nextDate)}>→</Button>
        <span className="ml-2 text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {(["day", "week", "month"] as View[]).map((v) => (
          <Button
            key={v}
            size="sm"
            variant={v === view ? "default" : "outline"}
            onClick={() => go(v, date)}
          >
            {t(`view.${v}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
