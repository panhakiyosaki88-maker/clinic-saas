"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setServicePriceArchived } from "@/server/actions/service-prices";
import { Button } from "@/components/ui/button";

/** Edit link + archive/restore toggle for a catalog row. */
export function CatalogRowActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      {!archived && (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/billing/catalog?edit=${id}`}>Edit</Link>
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
        {archived ? "Restore" : "Archive"}
      </Button>
    </div>
  );
}
