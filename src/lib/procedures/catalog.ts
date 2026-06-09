/**
 * The standard Procedures catalog — treatments/clinical services performed on the
 * patient, grouped by clinical area. Seeded per clinic (categories + services).
 *
 * IMPORTANT (classification guarantee): every name here is a Procedure ONLY and
 * must never appear in the Imaging catalog. The `PROCEDURE_RESERVED` matchers are
 * enforced by the Imaging create action so a treatment (Injection, Vaccination,
 * Dressing, Nebulization, Minor Surgery, Catheter Insertion) can never be filed
 * as an imaging study. Medical/service names stay in English (see i18n rules).
 */

export interface ProcedureCategorySeed {
  title: string;
  services: string[];
}

export const PROCEDURE_CATALOG: ProcedureCategorySeed[] = [
  {
    title: "Nursing Procedures",
    services: ["Injection", "IV Fluid Administration", "Catheter Insertion"],
  },
  {
    title: "Vaccinations",
    services: ["Flu Vaccine", "Hepatitis B Vaccine", "COVID Vaccine"],
  },
  {
    title: "Respiratory Therapy",
    services: ["Nebulization", "Oxygen Therapy"],
  },
  {
    title: "Wound Care",
    services: ["Wound Dressing", "Suture Removal"],
  },
  {
    title: "Minor Surgery",
    services: ["Abscess Drainage", "Incision and Drainage", "Minor Surgical Procedure"],
  },
  {
    title: "Other Clinical Services",
    services: ["Ear Irrigation", "Nail Removal"],
  },
];

/**
 * Substrings that mark a name as procedure-only. An imaging service whose name
 * matches any of these is rejected by the Imaging create action (the "DO NOT
 * DUPLICATE" rule: Injection / Vaccination / Dressing / Nebulization / Minor
 * Surgery / Catheter Insertion).
 */
export const PROCEDURE_RESERVED = [
  "injection",
  "vaccine",
  "vaccination",
  "dressing",
  "nebuliz",
  "minor surg",
  "catheter",
  "suture",
  "abscess",
  "incision",
] as const;

/** True when `name` is a procedure and must not be filed as an imaging study. */
export function isProcedureReserved(name: string): boolean {
  const n = name.trim().toLowerCase();
  return PROCEDURE_RESERVED.some((r) => n.includes(r));
}
