"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setServicePriceArchived, deleteServicePrice } from "@/server/actions/service-prices";
import { Button } from "@/components/ui/button";

/** Edit link + archive/restore toggle + permanent delete for a catalog row. */
export function CatalogRowActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const t = useTranslations("billing.catalogRow");
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      {!archived && (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/settings/billing/catalog?edit=${id}`}>{t("edit")}</Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await setServicePriceArchived(id, !archived);
            if (res.ok) router.refresh();
          })
        }
      >
        {archived ? t("restore") : t("archive")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-[var(--destructive)] hover:text-[var(--destructive)]"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("deleteConfirm"))) return;
          startTransition(async () => {
            const res = await deleteServicePrice(id);
            if (res.ok) router.refresh();
          });
        }}
      >
        {t("delete")}
      </Button>
    </div>
  );
}
