"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export function PatientSearch() {
  const t = useTranslations("patients");
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = React.useState(params.get("q") ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/patients?q=${encodeURIComponent(q)}` : "/patients");
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xs">
      <Input
        type="search"
        placeholder={t("search.placeholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t("search.aria")}
      />
    </form>
  );
}
