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
    items: [],
  },
  {
    id: "technical-cleanliness-comfort",
    title: "Texniki vəziyyət, restoranın təmizliyi və qonaqlar üçün komfort",
    items: [],
  },
  {
    id: "toilets",
    title: "Tualetlər",
    items: [],
  },
  {
    id: "kiosks",
    title: "Kiosklar",
    items: [],
  },
  {
    id: "service-counter",
    title: "Servis zonası (piştaxta)",
    items: [],
  },
  {
    id: "employee-appearance",
    title: "Əməkdaşın geyim və görünüş prosedurası (Şəxsi gigiyena)",
    items: [],
  },
  {
    id: "greeting-communication",
    title: "Qarşılama və ünsiyyət",
    items: [],
  },
  {
    id: "cash-service",
    title: "Kassa xidməti (Sales & Service)",
    items: [],
  },
  {
    id: "service-time",
    title: "Xidmət vaxtı (KFC)",
    items: [],
  },
  {
    id: "order-assembly",
    title: "Sifarişin yığılması",
    items: [],
  },
  {
    id: "product-quality",
    title: "Məhsul keyfiyyəti",
    items: [],
  },
  {
    id: "presenter",
    title: "Təqdim edən (Prezentor)",
    items: [],
  },
  {
    id: "complaints",
    title: "Şikayətlərlə iş (Guest Feedback & Complaints)",
    items: [],
  },
  {
    id: "employee-questions",
    title: "İşçilərə əlavə suallar",
    items: [],
  },
];
