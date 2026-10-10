const SECTION_ALIASES = {
  summary: [
    "summary",
    "profile",
    "professional summary",
    "about me",
    "haqqinda",
    "haqqında",
    "о себе",
    "профиль",
    "profil",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "iş təcrübəsi",
    "tecrube",
    "təcrübə",
    "опыт работы",
    "трудовой опыт",
  ],
  education: [
    "education",
    "academic background",
    "təhsil",
    "tehsil",
    "образование",
  ],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "bacarıqlar",
    "bacaqlar",
    "навыки",
    "профессиональные навыки",
  ],
  languages: [
    "languages",
    "language skills",
    "dillər",
    "diller",
    "языки",
    "знание языков",
  ],
  certificates: [
    "certifications",
    "certificates",
    "certifications & licenses",
    "sertifikatlar",
    "сертификаты",
    "сертификация",
  ],
};

const COMMON_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "React.js",
  "Node.js",
  "Express",
  "Python",
  "Java",
  "C++",
  "C#",
  "PHP",
  "Go",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Git",
  "GitHub",
  "HTML",
  "CSS",
  "Next.js",
  "NestJS",
  "Mongoose",
  "REST API",
  "GraphQL",
  "Linux",
  "HACCP",
  "Food safety",
  "Customer service",
  "Cash handling",
  "Kitchen operations",
  "Restaurant operations",
  "Shift management",
  "Team management",
  "Inventory management",
];

const COMMON_LANGUAGES = [
  "Azerbaijani",
  "English",
  "Russian",
  "Turkish",
  "German",
  "French",
  "Spanish",
  "Arabic",
];

function cleanText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
function extractEmail(text) {
  const lines = text.split("\n");
  const contact = lines.find(line => /(?:email|e-mail|e-poçt|elektron poçt|почта)\s*[:：]/iu.test(line) && line.match(EMAIL));
  return (contact?.match(EMAIL)?.[0] || text.match(EMAIL)?.[0] || "").toLowerCase();
}

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (/^0[1-9]\d{8}$/.test(digits)) return "+994" + digits.slice(1);
  if (/^994[1-9]\d{8}$/.test(digits)) return "+" + digits;
  const international = raw.trim().startsWith("+") ? digits : raw.trim().startsWith("00") ? digits.slice(2) : "";
  if (/^[1-9]\d{7,14}$/.test(international)) {
    if (international.startsWith("994") && !/^994[1-9]\d{8}$/.test(international)) return "";
    return "+" + international;
  }
  return "";
}
function extractPhone(text) {
  const lines = text.split("\n");
  const labelled = lines.filter(line => /phone|mobile|tel(?:efon)?|əlaqə|телефон|мобильн/iu.test(line));
  for (const line of [...labelled, ...lines]) {
    for (const match of line.matchAll(/(?<![\p{L}\p{N}])(?:\+|00)?\d[\d ().-]{6,30}\d(?![\p{L}\p{N}])/gu)) {
      const raw = match[0].trim(), normalized = normalizePhone(raw);
      if (normalized) return { raw, normalized };
    }
  }
  return { raw: "", normalized: "" };
}

function extractName(text) {
  const explicit = text.match(/(?:^|\n)\s*(?:name|full name|ad(?:\s*soyad)?|ad[ıi] soyad[ıi]|ф[иi]о|имя(?: и фамилия)?)\s*[:：]\s*([^\n]+)/iu);
  const valid = value => /^[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){1,4}$/u.test(value) && value.length <= 80;
  if (explicit && valid(explicit[1].trim())) return explicit[1].trim();
  const ignored = /^(?:curriculum vitae|cv|resume|résumé|резюме|contact information|personal details|professional summary|restaurant manager|customer service)$/iu;
  for (const line of text.split("\n").map(line => line.trim()).filter(Boolean).slice(0, 8)) {
    if (!ignored.test(line) && !normalizeSectionName(line) && valid(line) &&
        line.split(/\s+/).every(word => /^\p{Lu}/u.test(word))) return line;
  }
  return "";
}

function normalizeSectionName(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\u0307/g, "")
    .replace(/[^\p{L}\p{N}& ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(normalized)) {
      return section;
    }
  }

  return null;
}

function extractSections(text) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = {};
  let currentSection = null;

  for (const line of lines) {
    const sectionName = normalizeSectionName(line);

    if (sectionName) {
      currentSection = sectionName;

      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }

      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  return Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [
      key,
      value.join("\n").trim(),
    ])
  );
}

const SKILL_ALIASES = {
  "Food safety": ["qida təhlükəsizliyi", "пищевая безопасность", "безопасность пищевых продуктов"],
  "Customer service": ["müştəri xidməti", "обслуживание клиентов"],
  "Cash handling": ["kassa", "kassa əməliyyatları", "касса", "кассовые операции"],
  "Kitchen operations": ["mətbəx əməliyyatları", "работа на кухне"],
  "Restaurant operations": ["restoran əməliyyatları", "управление рестораном"],
  "Shift management": ["növbə idarəetməsi", "növbələrin idarə olunması", "управление сменой"],
  "Team management": ["komanda idarəetməsi", "управление командой"],
  "Inventory management": ["anbar idarəetməsi", "управление запасами"],
};
const LANGUAGE_ALIASES = {
  Azerbaijani: ["Azərbaycan dili", "Azərbaycan", "азербайджанский"],
  English: ["İngilis dili", "İngilis", "английский"],
  Russian: ["Rus dili", "русский"],
  Turkish: ["Türk dili", "турецкий"],
  German: ["Alman dili", "немецкий"],
  French: ["Fransız dili", "французский"],
};
function literalMatch(source, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", "iu"))?.[0] || "";
}
function extractSkills(text, sections) {
  const source = [sections.skills || "", text].join("\n");
  return unique(COMMON_SKILLS.filter(skill => [skill, ...(SKILL_ALIASES[skill] || [])].some(alias => literalMatch(source, alias))));
}
function extractLanguages(text, sections) {
  const source = sections.languages || text;
  return unique(COMMON_LANGUAGES.filter(language => [language, ...(LANGUAGE_ALIASES[language] || [])].some(alias => literalMatch(source, alias))));
}

function extractCertificates(sections) {
  if (!sections.certificates) {
    return [];
  }

  return unique(
    sections.certificates
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .filter(
        (line) =>
          !/^[-–—\s]*\d+\s+of\s+\d+\s*[-–—]*$/i.test(line)
      )
      .slice(0, 20)
  );
}

function experienceSource(text, sections) {
  return (sections.experience || text.split('\n').filter(line =>
    /experience|təcrübə|tecrube|опыт/iu.test(line)).join('\n')).split('\n').filter(line =>
    !/(?:\bage\b|yaş|возраст|years?\s+old)/iu.test(line)).join('\n');
}
function extractExperienceYears(text, sections) {
  const source = experienceSource(text, sections);

  const yearMatches = [
    ...source.matchAll(
      /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|il|лет|года?|год)/gi
    ),
  ];

  const values = yearMatches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 50);

  return values.length ? Math.max(...values) : null;
}

function extractEducation(sections) {
  if (!sections.education) {
    return "";
  }

  return sections.education
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");
}

function extractRole(sections, text = "") {
  const explicitRoleMatch = String(text || "").match(
    /(?:^|\n)\s*(?:role|position|job\s*title|title|vəzifə|должность)\s*[:\-]\s*(.+?)\s*$/im
  );

  if (explicitRoleMatch?.[1]) {
    return explicitRoleMatch[1].trim();
  }

  const source = sections.summary || "";

  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0] || "";
}

function datedEntries(source = "", kind = 'employment') {
  return source.split("\n").filter(Boolean).slice(0, 50).map(raw => {
    const dates = [...raw.matchAll(/(?:((?:0?[1-9]|1[0-2]))[./])?((?:19|20)\d{2})/g)];
    const prefix = raw.slice(0, dates[0]?.index ?? raw.length).replace(/[\s–—-]+$/, '');
    const parts = prefix.split(/\s+(?:–|—|\||-)\s+/);
    const organization = parts.length === 2 ? parts[kind === 'certification' ? 1 : 0] : /university|universitet|университет|college|колледж/iu.test(prefix) ? prefix : null;
    const title = parts.length === 2 ? parts[kind === 'certification' ? 0 : 1] : null;
    const row = { raw: raw.slice(0, 500), start: dates[0] ? { year: Number(dates[0][2]), month: dates[0][1] ? Number(dates[0][1]) : null } : null,
      end: dates[1] ? { year: Number(dates[1][2]), month: dates[1][1] ? Number(dates[1][1]) : null } : null,
      ongoing: /present|current|hazırda|indiyədək|настоящее время/iu.test(raw),
      organization, title };
    if (kind === 'certification' && dates.length === 1 && /expires|valid until|etibarl[ıi]|истекает|действителен до/iu.test(raw)) { row.end = row.start; row.start = null; }
    return row;
  });
}
function parseStructuredCv(text) {
  const normalizedText = cleanText(text).slice(0, 100000);
  const sections = extractSections(normalizedText), phone = extractPhone(normalizedText);
  const result = {
    name: extractName(normalizedText), email: extractEmail(normalizedText),
    phone: phone.normalized, phoneRaw: phone.raw,
    role: extractRole(sections, normalizedText), education: extractEducation(sections),
    skills: extractSkills(normalizedText, sections), experience: extractExperienceYears(normalizedText, sections),
    languages: extractLanguages(normalizedText, sections), certificates: extractCertificates(sections),
    employmentHistory: datedEntries(sections.experience), educationHistory: datedEntries(sections.education, 'education'),
    certificationHistory: datedEntries(sections.certificates, 'certification'),
    sections, rawText: normalizedText,
  };
  const quote = value => normalizedText.split("\n").find(line => line.toLowerCase().includes(String(value).toLowerCase()))?.slice(0, 500);
  const fields = {};
  for (const field of ["name", "email", "phone", "role", "education", "skills", "experience", "languages", "certificates", "employmentHistory", "educationHistory", "certificationHistory"]) {
    const value = result[field];
    const present = value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
    let evidence = [];
    if (present) {
      if (field === "phone") evidence = [phone.raw];
      else if (field === "experience") evidence = [...experienceSource(normalizedText, sections).matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|il|лет|года?|год)/giu)].filter(m => Number(m[1]) === value).map(m => m[0]);
      else if (["employmentHistory", "educationHistory", "certificationHistory"].includes(field)) evidence = value.map(item => item.raw);
      else if (["skills", "languages", "certificates"].includes(field)) {
        const aliases = field === "skills" ? SKILL_ALIASES : LANGUAGE_ALIASES;
        evidence = value.map(item => [item, ...(aliases[item] || [])].map(alias => quote(alias)).find(Boolean)).filter(Boolean);
      } else evidence = [quote(String(value).split("\n")[0])].filter(Boolean);
    }
    fields[field] = { source: "cv-text", evidence: unique(evidence).slice(0, 20), confidence: present ? (field === "name" ? 0.65 : 0.8) : null };
  }
  result.extraction = { version: "rules-2", provider: "rule-based", confidenceKind: "heuristic-not-probability", reviewStatus: "pending", fields,
    warnings: [...new Set(normalizedText.match(EMAIL) || [])].length > 1 ? ["multiple_emails"] : [] };
  return result;
}
module.exports = { parseStructuredCv, normalizePhone };
