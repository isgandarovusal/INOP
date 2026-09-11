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
        items: [
      {
        id: "hygiene-health-001",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "hygiene-health-002",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "hygiene-health-003",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "hygiene-health-004",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "hygiene-health-005",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "hygiene-health-006",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "hygiene-health-007",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "hygiene-health-008",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "hygiene-health-009",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "hygiene-health-010",
        label: "hygiene-health — müvəqqəti yoxlama kriteriyası 10",
      }
    ],
      },
      {
        id: "food-safety-temperature",
        title: "Bölmə 2 — Temperatura Nəzarət",
        expected: { total: 15, critical: 5, major: 8, minor: 2 },
        items: [
      {
        id: "temperature-control-001",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "temperature-control-002",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "temperature-control-003",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "temperature-control-004",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "temperature-control-005",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "temperature-control-006",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "temperature-control-007",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "temperature-control-008",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "temperature-control-009",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "temperature-control-010",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "temperature-control-011",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "temperature-control-012",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 12",
      },
      {
        id: "temperature-control-013",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 13",
      },
      {
        id: "temperature-control-014",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 14",
      },
      {
        id: "temperature-control-015",
        label: "temperature-control — müvəqqəti yoxlama kriteriyası 15",
      }
    ],
      },
      {
        id: "food-safety-expiry",
        title: "Bölmə 3 — İstifadə Müddəti",
        expected: { total: 3, critical: 3, major: 0, minor: 0 },
        items: [
      {
        id: "expiry-001",
        label: "expiry — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "expiry-002",
        label: "expiry — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "expiry-003",
        label: "expiry — müvəqqəti yoxlama kriteriyası 3",
      }
    ],
      },
      {
        id: "food-safety-contamination",
        title: "Bölmə 4 — Çirklənmənin Qarşısı",
        expected: { total: 49, critical: 14, major: 30, minor: 5 },
        items: [
      {
        id: "contamination-prevention-001",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "contamination-prevention-002",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "contamination-prevention-003",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "contamination-prevention-004",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "contamination-prevention-005",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "contamination-prevention-006",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "contamination-prevention-007",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "contamination-prevention-008",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "contamination-prevention-009",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "contamination-prevention-010",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "contamination-prevention-011",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "contamination-prevention-012",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 12",
      },
      {
        id: "contamination-prevention-013",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 13",
      },
      {
        id: "contamination-prevention-014",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 14",
      },
      {
        id: "contamination-prevention-015",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 15",
      },
      {
        id: "contamination-prevention-016",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 16",
      },
      {
        id: "contamination-prevention-017",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 17",
      },
      {
        id: "contamination-prevention-018",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 18",
      },
      {
        id: "contamination-prevention-019",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 19",
      },
      {
        id: "contamination-prevention-020",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 20",
      },
      {
        id: "contamination-prevention-021",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 21",
      },
      {
        id: "contamination-prevention-022",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 22",
      },
      {
        id: "contamination-prevention-023",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 23",
      },
      {
        id: "contamination-prevention-024",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 24",
      },
      {
        id: "contamination-prevention-025",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 25",
      },
      {
        id: "contamination-prevention-026",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 26",
      },
      {
        id: "contamination-prevention-027",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 27",
      },
      {
        id: "contamination-prevention-028",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 28",
      },
      {
        id: "contamination-prevention-029",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 29",
      },
      {
        id: "contamination-prevention-030",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 30",
      },
      {
        id: "contamination-prevention-031",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 31",
      },
      {
        id: "contamination-prevention-032",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 32",
      },
      {
        id: "contamination-prevention-033",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 33",
      },
      {
        id: "contamination-prevention-034",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 34",
      },
      {
        id: "contamination-prevention-035",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 35",
      },
      {
        id: "contamination-prevention-036",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 36",
      },
      {
        id: "contamination-prevention-037",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 37",
      },
      {
        id: "contamination-prevention-038",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 38",
      },
      {
        id: "contamination-prevention-039",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 39",
      },
      {
        id: "contamination-prevention-040",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 40",
      },
      {
        id: "contamination-prevention-041",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 41",
      },
      {
        id: "contamination-prevention-042",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 42",
      },
      {
        id: "contamination-prevention-043",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 43",
      },
      {
        id: "contamination-prevention-044",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 44",
      },
      {
        id: "contamination-prevention-045",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 45",
      },
      {
        id: "contamination-prevention-046",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 46",
      },
      {
        id: "contamination-prevention-047",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 47",
      },
      {
        id: "contamination-prevention-048",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 48",
      },
      {
        id: "contamination-prevention-049",
        label: "contamination-prevention — müvəqqəti yoxlama kriteriyası 49",
      }
    ],
      },
      {
        id: "food-safety-pests",
        title: "Bölmə 5 — Zərərvericilər",
        expected: { total: 18, critical: 6, major: 12, minor: 0 },
        items: [
      {
        id: "pests-001",
        label: "pests — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "pests-002",
        label: "pests — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "pests-003",
        label: "pests — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "pests-004",
        label: "pests — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "pests-005",
        label: "pests — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "pests-006",
        label: "pests — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "pests-007",
        label: "pests — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "pests-008",
        label: "pests — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "pests-009",
        label: "pests — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "pests-010",
        label: "pests — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "pests-011",
        label: "pests — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "pests-012",
        label: "pests — müvəqqəti yoxlama kriteriyası 12",
      },
      {
        id: "pests-013",
        label: "pests — müvəqqəti yoxlama kriteriyası 13",
      },
      {
        id: "pests-014",
        label: "pests — müvəqqəti yoxlama kriteriyası 14",
      },
      {
        id: "pests-015",
        label: "pests — müvəqqəti yoxlama kriteriyası 15",
      },
      {
        id: "pests-016",
        label: "pests — müvəqqəti yoxlama kriteriyası 16",
      },
      {
        id: "pests-017",
        label: "pests — müvəqqəti yoxlama kriteriyası 17",
      },
      {
        id: "pests-018",
        label: "pests — müvəqqəti yoxlama kriteriyası 18",
      }
    ],
      },
      {
        id: "food-safety-restaurant-standards",
        title: "Bölmə 6 — Əsas Restoran Std.",
        expected: { total: 20, critical: 8, major: 11, minor: 1 },
        items: [
      {
        id: "restaurant-standards-001",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "restaurant-standards-002",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "restaurant-standards-003",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "restaurant-standards-004",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "restaurant-standards-005",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "restaurant-standards-006",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "restaurant-standards-007",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "restaurant-standards-008",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "restaurant-standards-009",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "restaurant-standards-010",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "restaurant-standards-011",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "restaurant-standards-012",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 12",
      },
      {
        id: "restaurant-standards-013",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 13",
      },
      {
        id: "restaurant-standards-014",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 14",
      },
      {
        id: "restaurant-standards-015",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 15",
      },
      {
        id: "restaurant-standards-016",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 16",
      },
      {
        id: "restaurant-standards-017",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 17",
      },
      {
        id: "restaurant-standards-018",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 18",
      },
      {
        id: "restaurant-standards-019",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 19",
      },
      {
        id: "restaurant-standards-020",
        label: "restaurant-standards — müvəqqəti yoxlama kriteriyası 20",
      }
    ],
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
        items: [
      {
        id: "guest-area-001",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "guest-area-002",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "guest-area-003",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "guest-area-004",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "guest-area-005",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "guest-area-006",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "guest-area-007",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "guest-area-008",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "guest-area-009",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "guest-area-010",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "guest-area-011",
        label: "guest-area — müvəqqəti yoxlama kriteriyası 11",
      }
    ],
      },
      {
        id: "brand-product-standard",
        title: "Bölmə 2 — Məhsul Standartı",
        expected: { total: 14, critical: 2, major: 6, minor: 6 },
        items: [
      {
        id: "product-standard-001",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "product-standard-002",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "product-standard-003",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "product-standard-004",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "product-standard-005",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "product-standard-006",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "product-standard-007",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "product-standard-008",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "product-standard-009",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "product-standard-010",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "product-standard-011",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "product-standard-012",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 12",
      },
      {
        id: "product-standard-013",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 13",
      },
      {
        id: "product-standard-014",
        label: "product-standard — müvəqqəti yoxlama kriteriyası 14",
      }
    ],
      },
      {
        id: "brand-accuracy",
        title: "Bölmə 3 — Dəqiqlik",
        expected: { total: 18, critical: 0, major: 18, minor: 0 },
        items: [
      {
        id: "accuracy-001",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "accuracy-002",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "accuracy-003",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "accuracy-004",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "accuracy-005",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "accuracy-006",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "accuracy-007",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "accuracy-008",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "accuracy-009",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "accuracy-010",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "accuracy-011",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "accuracy-012",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 12",
      },
      {
        id: "accuracy-013",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 13",
      },
      {
        id: "accuracy-014",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 14",
      },
      {
        id: "accuracy-015",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 15",
      },
      {
        id: "accuracy-016",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 16",
      },
      {
        id: "accuracy-017",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 17",
      },
      {
        id: "accuracy-018",
        label: "accuracy — müvəqqəti yoxlama kriteriyası 18",
      }
    ],
      },
      {
        id: "brand-technology-equipment",
        title: "Bölmə 4 — Texnologiya/Avadanlıq",
        expected: { total: 1, critical: 1, major: 0, minor: 0 },
        items: [
      {
        id: "technology-equipment-001",
        label: "technology-equipment — müvəqqəti yoxlama kriteriyası 1",
      }
    ],
      },
    ],
  },
];
