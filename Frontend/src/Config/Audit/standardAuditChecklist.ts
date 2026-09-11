export interface StandardChecklistItem {
  id: string;
  label: string;
}

export interface StandardSubsection {
  id: string;
  title: string;
  expected: {
    total: number;
    critical: number;
    major: number;
    minor: number;
  };
  items: StandardChecklistItem[];
}

export interface StandardCategory {
  id: string;
  title: string;
  subsections: StandardSubsection[];
}

export const standardAuditChecklist: StandardCategory[] = [
  {
    id: "food-safety",
    title: "Qida təhlükəsizliyi / Food Safety",
    subsections: [
      {
        id: "food-safety-hygiene-health",
        title: "Bölmə 1 — Gigiyena & Sağlamlıq",
        expected: { total: 10, critical: 8, major: 2, minor: 0 },
        items: [],
      },
      {
        id: "food-safety-temperature",
        title: "Bölmə 2 — Temperatura Nəzarət",
        expected: { total: 15, critical: 5, major: 8, minor: 2 },
        items: [],
      },
      {
        id: "food-safety-expiry",
        title: "Bölmə 3 — İstifadə Müddəti",
        expected: { total: 3, critical: 3, major: 0, minor: 0 },
        items: [],
      },
      {
        id: "food-safety-contamination",
        title: "Bölmə 4 — Çirklənmənin Qarşısı",
        expected: { total: 49, critical: 14, major: 30, minor: 5 },
        items: [],
      },
      {
        id: "food-safety-pests",
        title: "Bölmə 5 — Zərərvericilər",
        expected: { total: 18, critical: 6, major: 12, minor: 0 },
        items: [],
      },
      {
        id: "food-safety-restaurant-standards",
        title: "Bölmə 6 — Əsas Restoran Std.",
        expected: { total: 20, critical: 8, major: 11, minor: 1 },
        items: [],
      },
    ],
  },
  {
    id: "brand-standards",
    title: "Brend standartları / Brand Standards",
    subsections: [
      {
        id: "brand-guest-area",
        title: "Bölmə 1 — Qonaq Sahəsi",
        expected: { total: 11, critical: 0, major: 9, minor: 2 },
        items: [],
      },
      {
        id: "brand-product-standard",
        title: "Bölmə 2 — Məhsul Standartı",
        expected: { total: 14, critical: 2, major: 6, minor: 6 },
        items: [],
      },
      {
        id: "brand-accuracy",
        title: "Bölmə 3 — Dəqiqlik",
        expected: { total: 18, critical: 0, major: 18, minor: 0 },
        items: [],
      },
      {
        id: "brand-technology-equipment",
        title: "Bölmə 4 — Texnologiya/Avadanlıq",
        expected: { total: 1, critical: 1, major: 0, minor: 0 },
        items: [],
      },
    ],
  },
];
