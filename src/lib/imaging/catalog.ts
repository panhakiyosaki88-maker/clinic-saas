/**
 * The standard Imaging catalog — diagnostic investigations grouped by modality.
 * Seeded per clinic (categories + services) and used to drive the request picker.
 *
 * IMPORTANT (classification guarantee): every name here is Imaging ONLY. A name
 * that appears in this file must never appear in the Procedures catalog. The
 * `IMAGING_RESERVED` matchers below are enforced by the Procedures create action
 * so a study (ECG, X-Ray, Ultrasound, CT, MRI, Mammography) can never be filed
 * as a procedure. Medical/service names stay in English (see i18n rules).
 */

export interface ImagingServiceSeed {
  name: string;
  modality: string;
}

export interface ImagingCategorySeed {
  title: string; // category (modality grouping)
  services: ImagingServiceSeed[];
}

export const IMAGING_CATALOG: ImagingCategorySeed[] = [
  {
    title: "Radiology",
    services: [
      { name: "Chest X-Ray", modality: "X-Ray" },
      { name: "Spine X-Ray", modality: "X-Ray" },
      { name: "Hand X-Ray", modality: "X-Ray" },
      { name: "Pelvis X-Ray", modality: "X-Ray" },
    ],
  },
  {
    title: "Ultrasound",
    services: [
      { name: "Abdominal Ultrasound", modality: "Ultrasound" },
      { name: "Pelvic Ultrasound", modality: "Ultrasound" },
      { name: "Thyroid Ultrasound", modality: "Ultrasound" },
      { name: "Pregnancy Ultrasound", modality: "Ultrasound" },
    ],
  },
  {
    title: "Cardiac Diagnostics",
    services: [
      { name: "ECG", modality: "ECG" },
      { name: "EKG", modality: "ECG" },
    ],
  },
  {
    title: "Advanced Imaging",
    services: [
      { name: "CT Scan", modality: "CT" },
      { name: "MRI", modality: "MRI" },
    ],
  },
  {
    title: "Women's Imaging",
    services: [{ name: "Mammography", modality: "Mammography" }],
  },
];

/** Modality options for the catalog form. */
export const IMAGING_MODALITIES = ["X-Ray", "Ultrasound", "ECG", "CT", "MRI", "Mammography", "Other"] as const;

/**
 * Substrings that mark a name as imaging-only. A procedure whose name matches any
 * of these is rejected by the Procedures create action (the "DO NOT DUPLICATE"
 * rule: ECG / EKG / X-Ray / Ultrasound / CT Scan / MRI / Mammography).
 */
export const IMAGING_RESERVED = [
  "ecg",
  "ekg",
  "x-ray",
  "xray",
  "ultrasound",
  "sonography",
  "ct scan",
  "mri",
  "mammogra",
] as const;

/** True when `name` is an imaging study and must not be filed as a procedure. */
export function isImagingReserved(name: string): boolean {
  const n = name.trim().toLowerCase();
  return IMAGING_RESERVED.some((r) => n.includes(r));
}
