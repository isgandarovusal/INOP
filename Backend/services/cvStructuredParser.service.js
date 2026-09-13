const SECTION_ALIASES = {
  summary: [
    "summary",
    "profile",
    "professional summary",
    "about me",
    "haqqinda",
    "profil",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "iş təcrübəsi",
    "tecrube",
  ],
  education: [
    "education",
    "academic background",
    "təhsil",
    "tehsil",
  ],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "bacarıqlar",
    "bacaqlar",
  ],
  languages: [
    "languages",
    "language skills",
    "dillər",
    "diller",
  ],
  certificates: [
    "certifications",
    "certificates",
    "certifications & licenses",
    "sertifikatlar",
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

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0].trim().toLowerCase() : "";
}

function extractPhone(text) {
  const matches = text.match(
    /(?:\+994|0)\s*(?:50|51|55|70|77|99|10|12)\s*[-().\s]*\d{3}\s*[-.\s]*\d{2}\s*[-.\s]*\d{2}/g
  );

  return matches?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function extractName(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    if (
      line.includes("@") ||
      /\d{5,}/.test(line) ||
      line.length < 3 ||
      line.length > 80
    ) {
      continue;
    }

    const words = line.split(/\s+/);

    if (
      words.length >= 2 &&
      words.length <= 5 &&
      words.every((word) =>
        /^[A-Za-zƏəĞğÇçŞşİiÖöÜü\s'-]+$/.test(word)
      )
    ) {
      return line;
    }
  }

  return "";
}

function normalizeSectionName(value) {
  const normalized = String(value || "")
    .toLowerCase()
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

function extractSkills(text, sections) {
  const source = [
    sections.skills || "",
    text,
  ].join("\n");

  const lowerSource = source.toLowerCase();

  return unique(
    COMMON_SKILLS.filter((skill) =>
      lowerSource.includes(skill.toLowerCase())
    )
  );
}

function extractLanguages(text, sections) {
  const source = [
    sections.languages || "",
    text,
  ].join("\n");

  const lowerSource = source.toLowerCase();

  return unique(
    COMMON_LANGUAGES.filter((language) =>
      lowerSource.includes(language.toLowerCase())
    )
  );
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

function extractExperienceYears(text, sections) {
  const source = [
    sections.experience || "",
    text,
  ].join("\n");

  const yearMatches = [
    ...source.matchAll(
      /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|il|il\s+təcrübə)/gi
    ),
  ];

  const values = yearMatches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 50);

  return values.length ? Math.max(...values) : 0;
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
    /(?:^|\n)\s*(?:role|position|job\s*title|title)\s*[:\-]\s*(.+?)\s*$/im
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

function parseStructuredCv(text) {
  const normalizedText = cleanText(text);
  const sections = extractSections(normalizedText);

  return {
    name: extractName(normalizedText),
    email: extractEmail(normalizedText),
    phone: extractPhone(normalizedText),
    role: extractRole(sections, normalizedText),
    education: extractEducation(sections),
    skills: extractSkills(normalizedText, sections),
    experience: extractExperienceYears(
      normalizedText,
      sections
    ),
    languages: extractLanguages(
      normalizedText,
      sections
    ),
    certificates: extractCertificates(sections),
    sections,
    rawText: normalizedText,
  };
}

module.exports = {
  parseStructuredCv,
};
