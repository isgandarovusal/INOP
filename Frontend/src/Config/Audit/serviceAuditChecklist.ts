export interface AuditChecklistItem {
  id: string;
  label: string;
}

export interface AuditChecklistSection {
  id: string;
  title: string;
  items: AuditChecklistItem[];
}

export const serviceAuditChecklist: AuditChecklistSection[] = [
  {
    id: "first-impression",
    title: "İlk təəssürat",
    items: [
      {
        id: "first-impression-01-01",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "first-impression-01-02",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "first-impression-01-03",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "first-impression-01-04",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "first-impression-01-05",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "first-impression-01-06",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "first-impression-01-07",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "first-impression-01-08",
        label: "first-impression — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "technical-cleanliness-comfort",
    title: "Texniki vəziyyət, restoranın təmizliyi və qonaqlar üçün komfort",
    items: [
      {
        id: "technical-condition-01-01",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "technical-condition-01-02",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "technical-condition-01-03",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "technical-condition-01-04",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "technical-condition-01-05",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "technical-condition-01-06",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "technical-condition-01-07",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "technical-condition-01-08",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "technical-condition-01-09",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "technical-condition-01-10",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 10",
      },
      {
        id: "technical-condition-01-11",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 11",
      },
      {
        id: "technical-condition-01-12",
        label: "technical-condition — müvəqqəti yoxlama kriteriyası 12",
      }
    ],
  },
  {
    id: "toilets",
    title: "Tualetlər",
    items: [
      {
        id: "toilets-01-01",
        label: "toilets — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "toilets-01-02",
        label: "toilets — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "toilets-01-03",
        label: "toilets — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "toilets-01-04",
        label: "toilets — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "toilets-01-05",
        label: "toilets — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "toilets-01-06",
        label: "toilets — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "toilets-01-07",
        label: "toilets — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "toilets-01-08",
        label: "toilets — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "kiosks",
    title: "Kiosklar",
    items: [
      {
        id: "kiosks-01-01",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "kiosks-01-02",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "kiosks-01-03",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "kiosks-01-04",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "kiosks-01-05",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "kiosks-01-06",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "kiosks-01-07",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "kiosks-01-08",
        label: "kiosks — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "service-counter",
    title: "Servis zonası (piştaxta)",
    items: [
      {
        id: "service-counter-01-01",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "service-counter-01-02",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "service-counter-01-03",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "service-counter-01-04",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "service-counter-01-05",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "service-counter-01-06",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "service-counter-01-07",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "service-counter-01-08",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "service-counter-01-09",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "service-counter-01-10",
        label: "service-counter — müvəqqəti yoxlama kriteriyası 10",
      }
    ],
  },
  {
    id: "employee-appearance",
    title: "Əməkdaşın geyim və görünüş prosedurası (Şəxsi gigiyena)",
    items: [
      {
        id: "employee-appearance-01-01",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "employee-appearance-01-02",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "employee-appearance-01-03",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "employee-appearance-01-04",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "employee-appearance-01-05",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "employee-appearance-01-06",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "employee-appearance-01-07",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "employee-appearance-01-08",
        label: "employee-appearance — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "greeting-communication",
    title: "Qarşılama və ünsiyyət",
    items: [
      {
        id: "greeting-communication-01-01",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "greeting-communication-01-02",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "greeting-communication-01-03",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "greeting-communication-01-04",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "greeting-communication-01-05",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "greeting-communication-01-06",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "greeting-communication-01-07",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "greeting-communication-01-08",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "greeting-communication-01-09",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "greeting-communication-01-10",
        label: "greeting-communication — müvəqqəti yoxlama kriteriyası 10",
      }
    ],
  },
  {
    id: "cash-service",
    title: "Kassa xidməti (Sales & Service)",
    items: [
      {
        id: "cash-service-01-01",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "cash-service-01-02",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "cash-service-01-03",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "cash-service-01-04",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "cash-service-01-05",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "cash-service-01-06",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "cash-service-01-07",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "cash-service-01-08",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "cash-service-01-09",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "cash-service-01-10",
        label: "cash-service — müvəqqəti yoxlama kriteriyası 10",
      }
    ],
  },
  {
    id: "service-time",
    title: "Xidmət vaxtı (KFC)",
    items: [
      {
        id: "service-time-01-01",
        label: "service-time — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "service-time-01-02",
        label: "service-time — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "service-time-01-03",
        label: "service-time — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "service-time-01-04",
        label: "service-time — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "service-time-01-05",
        label: "service-time — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "service-time-01-06",
        label: "service-time — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "service-time-01-07",
        label: "service-time — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "service-time-01-08",
        label: "service-time — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "order-assembly",
    title: "Sifarişin yığılması",
    items: [
      {
        id: "order-assembly-01-01",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "order-assembly-01-02",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "order-assembly-01-03",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "order-assembly-01-04",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "order-assembly-01-05",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "order-assembly-01-06",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "order-assembly-01-07",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "order-assembly-01-08",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "order-assembly-01-09",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "order-assembly-01-10",
        label: "order-assembly — müvəqqəti yoxlama kriteriyası 10",
      }
    ],
  },
  {
    id: "product-quality",
    title: "Məhsul keyfiyyəti",
    items: [
      {
        id: "product-quality-01-01",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "product-quality-01-02",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "product-quality-01-03",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "product-quality-01-04",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "product-quality-01-05",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "product-quality-01-06",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "product-quality-01-07",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "product-quality-01-08",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 8",
      },
      {
        id: "product-quality-01-09",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 9",
      },
      {
        id: "product-quality-01-10",
        label: "product-quality — müvəqqəti yoxlama kriteriyası 10",
      }
    ],
  },
  {
    id: "presenter",
    title: "Təqdim edən (Prezentor)",
    items: [
      {
        id: "presenter-01-01",
        label: "presenter — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "presenter-01-02",
        label: "presenter — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "presenter-01-03",
        label: "presenter — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "presenter-01-04",
        label: "presenter — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "presenter-01-05",
        label: "presenter — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "presenter-01-06",
        label: "presenter — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "presenter-01-07",
        label: "presenter — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "presenter-01-08",
        label: "presenter — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "complaints",
    title: "Şikayətlərlə iş (Guest Feedback & Complaints)",
    items: [
      {
        id: "complaints-01-01",
        label: "complaints — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "complaints-01-02",
        label: "complaints — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "complaints-01-03",
        label: "complaints — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "complaints-01-04",
        label: "complaints — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "complaints-01-05",
        label: "complaints — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "complaints-01-06",
        label: "complaints — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "complaints-01-07",
        label: "complaints — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "complaints-01-08",
        label: "complaints — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
  {
    id: "employee-questions",
    title: "İşçilərə əlavə suallar",
    items: [
      {
        id: "employee-questions-01-01",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 1",
      },
      {
        id: "employee-questions-01-02",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 2",
      },
      {
        id: "employee-questions-01-03",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 3",
      },
      {
        id: "employee-questions-01-04",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 4",
      },
      {
        id: "employee-questions-01-05",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 5",
      },
      {
        id: "employee-questions-01-06",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 6",
      },
      {
        id: "employee-questions-01-07",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 7",
      },
      {
        id: "employee-questions-01-08",
        label: "employee-questions — müvəqqəti yoxlama kriteriyası 8",
      }
    ],
  },
];
