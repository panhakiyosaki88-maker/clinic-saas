"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

export interface PatientOption {
  id: string;
  label: string;
}

/**
 * Option list for a patient `<select>`. When `queueIds` is non-empty, the
 * patients on today's Live Queue Board are pulled to the top under an "In queue
 * today" group (in the given order), with everyone else under "All patients".
 * Render this as the children of a `<select>` (after its placeholder option).
 */
export function PatientOptions({
  patients,
  queueIds = [],
}: {
  patients: PatientOption[];
  queueIds?: string[];
}) {
  const t = useTranslations("patientPicker");
  const byId = React.useMemo(() => new Map(patients.map((p) => [p.id, p] as const)), [patients]);
  const queue = React.useMemo(
    () => queueIds.map((id) => byId.get(id)).filter((p): p is PatientOption => Boolean(p)),
    [queueIds, byId]
  );

  if (queue.length === 0) {
    return (
      <>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </>
    );
  }

  const queueSet = new Set(queue.map((p) => p.id));
  const others = patients.filter((p) => !queueSet.has(p.id));

  return (
    <>
      <optgroup label={t("queueToday", { count: queue.length })}>
        {queue.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </optgroup>
      {others.length > 0 && (
        <optgroup label={t("otherPatients")}>
          {others.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}
