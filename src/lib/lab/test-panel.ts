/**
 * Standard lab test panel, grouped by section. Used by the New Lab Request form
 * to let users tick the tests to order. Labels are display strings; the test
 * name is stored verbatim on each lab_request (one request per ticked test).
 *
 * Transcribed verbatim from the clinic's laboratory requisition sheet
 * (medical_test_form_template.md) — kept faithful to the printed form.
 */
export interface LabTestGroup {
  title: string;
  tests: string[];
}

export const LAB_TEST_PANEL: LabTestGroup[] = [
  {
    title: "HEMATOLOGIE",
    tests: [
      "Hg (CBC)",
      "Cytologie sanguine (Morphology)",
      "VS (ESR)",
      "Groupe ABO et Rhésus",
      "Réticulocytes",
      "Sero-Malaria (Ag-P.f, Ag-P.v)",
    ],
  },
  {
    title: "BIOCHIMIE SANGUINE",
    tests: [
      "Acide urique",
      "Albumine",
      "APO A-I",
      "APO B",
      "Bilirubine T & D",
      "CO2",
      "Calcémie",
      "Cholestérol totale",
      "Cholestérol HDL",
      "Cholestérol LDL",
      "Cholestérol VLDL",
      "Triglycérides",
      "Urée (BUN)",
      "Créatinine",
      "Cystatine C",
      "Clairence de la Créatinine (MDRD)",
      "Fer sérique (Iron)",
      "Glycémie",
      "HbA1C",
      "C-peptide",
      "Ionogramme (Na+, K+, Cl-)",
      "Magnésium",
      "Lactate",
      "CRP",
      "Protéine totale",
      "Phosphorémie",
    ],
  },
  {
    title: "ENZYMOLOGIE",
    tests: [
      "Amylasémie",
      "Lipase",
      "LDH",
      "CPK",
      "CK-MB",
      "Troponine I",
      "Gamma GT",
      "PAL",
      "Transaminases",
    ],
  },
  {
    title: "MARQUEURS TUMORAUX",
    tests: [
      "AFP",
      "ACE",
      "CA 125",
      "CA 15-3",
      "CA 19-9",
      "Ferritine",
      "PSA totale",
      "PSA libre",
      "β-2 microglobuline",
    ],
  },
  {
    title: "RECHERCH DU B.K",
    tests: [
      "Grachat (Sputum)",
      "ECBC",
      "Sérologie Tuberculose (B.K) IgM+IgG",
    ],
  },
  {
    title: "HEMOSTASE",
    tests: [
      "Taux de Prothrombine (PT)",
      "TCA (APTT)",
      "Fibrinogéne",
      "Factor V",
    ],
  },
  {
    title: "HEPATITES A, B, C",
    tests: [
      "Ac Anti-HAV(IgM)",
      "Ag-HBs (ELISA)",
      "Ag-HBs (CLIA)",
      "Ag-HBs IU (quantitative)",
      "Ac Anti-HBs (qualitative)",
      "Ac Anti-HBs (quantitative)",
      "Ag-HBe",
      "Ac Anti-HBe",
      "Ac Anti-HBc totale",
      "Ac Anti-HCV(ELISA)",
      "Ac Anti-HCV(CLIA)",
    ],
  },
  {
    title: "SEROLOGIE H.I.V",
    tests: [
      "H.I.V 1+2 (ELISA)",
      "H.I.V 1+2 (CLIA)",
    ],
  },
  {
    title: "PCR DE L'HEPATITES B, C",
    tests: [
      "VHB-ADN (quantitative)",
      "VHB -AND GENOTYPE",
      "HCV-ARN (quantitative)",
      "HCV-ARN GENOTYPE",
    ],
  },
  {
    title: "SEROLOGIE ET IMMULOGIE",
    tests: [
      "ASLO (Antistreptolisine O)",
      "Facteur Rhumatoïde",
      "Ig E totale",
      "Syphilis (TPHA + RPR)",
      "Widal (TO et TH)",
      "Helicobacter Pylori IgM",
      "Helicobacter Pylori IgG",
      "Ag H.Pylori (stool test)",
    ],
  },
  {
    title: "HORMONOLOGIE",
    tests: [
      "FT3",
      "FT4",
      "TSH",
      "Ac Anti-Recepteur TSH (TRAb)",
      "Anti-TPO",
      "Anti Thyroglobuline",
      "Thyroglobuline",
      "Cortisol á 8h",
      "Béta HCG (quantitative)",
    ],
  },
  {
    title: "SEROLOGIE DES PARASITES",
    tests: [
      "Toxoplasmose IgM",
      "Toxoplasmose Ig G",
      "Rubéole IgM",
      "Rubéole IgG",
    ],
  },
  {
    title: "LCR, PLEURALE, ASCITE",
    tests: [
      "Protéine, Glucose, Cytologie",
      "Culture",
    ],
  },
  {
    title: "PARASITOLOGIE DES SELLES",
    tests: [
      "Parasitologie (KOPI)",
      "Coproculture",
    ],
  },
  {
    title: "BIOCHIMIE URINAIRE",
    tests: [
      "Protéine Sucre",
      "Cytologie urinaire",
      "Uroculture (ECBU)",
      "Protéine 24h (urine)",
      "Microalbumine",
    ],
  },
  {
    title: "ANEMIE / METABOLIQUE",
    tests: [
      "Vitamine B12",
      "Vitamine D (25-OH)",
      "Folate",
    ],
  },
  {
    title: "OTHERS",
    tests: [
      "Dengue (Ag-NS1, IgM, IgG)",
      "Dengue (IgM, IgG)",
      "Chikungunya IgM / IgG",
      "Flu A, B",
      "Hémoccult (Fecal occult blood test)",
      "Procalcitonine",
      "Amphétamine (urine)",
      "Méthamphétamine (urine)",
      "Électrophorése d'Hémoglobine (EHb)",
      "Électrophorése Protéine",
      "Anti GAD65",
      "Anti-IA2",
      "IAA",
    ],
  },
];

/** Flat set of all known panel test names, for validation/lookups. */
export const LAB_TEST_NAMES: string[] = LAB_TEST_PANEL.flatMap((g) => g.tests);
