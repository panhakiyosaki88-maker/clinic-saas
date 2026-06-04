/**
 * Standard lab test panel, grouped by section. Used by the New Lab Request form
 * to let users tick the tests to order. Labels are display strings; the test
 * name is stored verbatim on each lab_request (one request per ticked test).
 */
export interface LabTestGroup {
  title: string;
  tests: string[];
}

export const LAB_TEST_PANEL: LabTestGroup[] = [
  {
    title: "Hématologie",
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
    title: "Biochimie sanguine",
    tests: [
      "Acide urique",
      "Albumine",
      "APO A-I",
      "APO B",
      "Bilirubine T & D",
      "CO₂",
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
      "Ionogramme (Na⁺, K⁺, Cl⁻)",
      "Magnésium",
      "Lactate",
      "CRP",
      "Protéine totale",
      "Phosphorémie",
    ],
  },
  {
    title: "Enzymologie",
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
    title: "Marqueurs tumoraux",
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
    title: "Recherche du B.K",
    tests: [
      "Crachat (Sputum)",
      "ECBC",
      "Sérologie Tuberculose (B.K) IgM+IgG",
    ],
  },
  {
    title: "Hémostase",
    tests: [
      "Taux de Prothrombine (PT)",
      "TCA (APTT)",
      "Fibrinogène",
      "Facteur V",
    ],
  },
  {
    title: "Hépatites A, B, C",
    tests: [
      "Ac Anti-HAV (IgM)",
      "Ag-HBs (ELISA)",
      "Ag-HBs (CLIA)",
      "Ag-HBs IU (quantitative)",
      "Ac Anti-HBs (qualitative)",
      "Ac Anti-HBs (quantitative)",
      "Ag-HBe",
      "Ac Anti-HBe",
      "Ac Anti-HBc totale",
      "Ac Anti-HCV (ELISA)",
      "Ac Anti-HCV (CLIA)",
    ],
  },
  {
    title: "Sérologie H.I.V",
    tests: [
      "H.I.V 1+2 (ELISA)",
      "H.I.V 1+2 (CLIA)",
    ],
  },
  {
    title: "PCR de l'hépatites B, C",
    tests: [
      "VHB-ADN (quantitative)",
      "VHB-ADN génotype",
      "HCV-ARN (quantitative)",
      "HCV-ARN génotype",
    ],
  },
  {
    title: "Sérologie et immunologie",
    tests: [
      "ASLO (Antistreptolysine O)",
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
    title: "Hormonologie",
    tests: [
      "FT3",
      "FT4",
      "TSH",
      "Ac Anti-Récepteur TSH (TRAb)",
      "Anti-TPO",
      "Anti-Thyroglobuline",
      "Thyroglobuline",
      "Cortisol à 8h",
      "Bêta HCG (quantitative)",
    ],
  },
  {
    title: "Sérologie des parasites",
    tests: [
      "Toxoplasmose IgM",
      "Toxoplasmose IgG",
      "Rubéole IgM",
      "Rubéole IgG",
    ],
  },
  {
    title: "LCR, pleurale, ascite",
    tests: [
      "Protéine, Glucose, Cytologie",
      "Culture",
    ],
  },
  {
    title: "Parasitologie des selles",
    tests: [
      "Parasitologie (KOPI)",
      "Coproculture",
    ],
  },
  {
    title: "Biochimie urinaire",
    tests: [
      "Protéine, Sucre",
      "Cytologie urinaire",
      "Uroculture (ECBU)",
      "Protéine 24h (urine)",
      "Microalbumine",
    ],
  },
  {
    title: "Anémie / métabolique",
    tests: [
      "Vitamine B12",
      "Vitamine D (25-OH)",
      "Folate",
    ],
  },
  {
    title: "Others",
    tests: [
      "Dengue (Ag-NS1, IgM, IgG)",
      "Dengue (IgM, IgG)",
      "Chikungunya IgM / IgG",
      "Flu A, B",
      "Hémoccult (Fecal occult blood test)",
      "Procalcitonine",
      "Amphétamine (urine)",
      "Méthamphétamine (urine)",
      "Électrophorèse d'Hémoglobine (EHb)",
      "Électrophorèse Protéine",
      "Anti GAD65",
      "Anti-IA₂",
      "IAA",
    ],
  },
];

/** Flat set of all known panel test names, for validation/lookups. */
export const LAB_TEST_NAMES: string[] = LAB_TEST_PANEL.flatMap((g) => g.tests);
