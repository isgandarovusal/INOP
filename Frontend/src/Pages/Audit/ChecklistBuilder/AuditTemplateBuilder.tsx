import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createAuditTemplate,
  getAuditTemplate,
  updateAuditTemplate,
} from "../../../Services/auditTemplatesService";
import {
  getAuditSourceDocuments,
  uploadAuditSourceDocument,
  deleteAuditSourceDocument,
} from "../../../Services/auditSourceDocumentsService";
import type {
  AuditSourceDocument,
} from "../../../Services/auditSourceDocumentsService";
import type {
  AuditTemplate,
  AuditTemplateQuestion,
  AuditTemplateSection,
  AuditTemplateSubsection,
  AuditTemplateType,
} from "../../../Types/Audit";

const emptyTemplate = (): Partial<AuditTemplate> => ({
  organizationId: "",
  brandId: "",
  brandName: "",
  auditType: "service",
  name: "",
  version: "1.0",
  status: "draft",
  sections: [],
  sourceDocumentIds: [],
});

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function newQuestion(order: number): AuditTemplateQuestion {
  return {
    id: makeId("question"),
    label: "Yeni sual",
    answerType: "yes-no-na",
    required: true,
    active: true,
    order,
  };
}

function newSubsection(order: number): AuditTemplateSubsection {
  return {
    id: makeId("subsection"),
    title: "Yeni alt bölmə",
    active: true,
    order,
    questions: [newQuestion(0)],
  };
}

function newSection(order: number): AuditTemplateSection {
  return {
    id: makeId("section"),
    title: "Yeni bölmə",
    active: true,
    order,
    subsections: [newSubsection(0)],
    questions: [],
  };
}

export default function AuditTemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] =
    useState<Partial<AuditTemplate>>(emptyTemplate());
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<
    Record<string, boolean>
  >({});

  const [documents, setDocuments] = useState<
    AuditSourceDocument[]
  >([]);

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
if (id) {
      getAuditTemplate(id)
        .then((data) => setTemplate(data))
        .finally(() => setLoading(false));
    }

    getAuditSourceDocuments()
      .then((data) => setDocuments(data))
      .catch(() => setDocuments([]));
    };

    load();
  }, [id]);

  async function handleDocumentUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      const uploaded = await uploadAuditSourceDocument(
        file,
        {
          organizationId: template.organizationId || "",
          brandId: template.brandId || "",
          auditType:
            template.auditType || "service",
        }
      );

      setDocuments((current) => [
        uploaded,
        ...current,
      ]);

      setTemplate((current) => ({
        ...current,
        sourceDocumentIds: [
          ...(current.sourceDocumentIds || []),
          uploaded.id,
        ],
      }));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }


  async function removeSourceDocument(id: string) {
    await deleteAuditSourceDocument(id);

    setDocuments((current) =>
      current.filter((item) => item.id !== id)
    );

    setTemplate((current) => ({
      ...current,
      sourceDocumentIds:
        (current.sourceDocumentIds || []).filter(
          (item) => item !== id
        ),
    }));
  }

  function toggleSourceDocument(id: string) {
    setTemplate((current) => ({
      ...current,
      sourceDocumentIds: (
        current.sourceDocumentIds || []
      ).includes(id)
        ? (current.sourceDocumentIds || []).filter(
            (item) => item !== id
          )
        : [
            ...(current.sourceDocumentIds || []),
            id,
          ],
    }));
  }

  function updateSection(
    sectionId: string,
    patch: Partial<AuditTemplateSection>
  ) {
    setTemplate((current) => ({
      ...current,
      sections: (current.sections || []).map((section) =>
        section.id === sectionId
          ? { ...section, ...patch }
          : section
      ),
    }));
  }

  function addSection() {
    const sections = template.sections || [];
    const section = newSection(sections.length);

    setTemplate({
      ...template,
      sections: [...sections, section],
    });

    setOpenSections({
      ...openSections,
      [section.id]: true,
    });
  }

  function removeSection(sectionId: string) {
    setTemplate({
      ...template,
      sections: (template.sections || []).filter(
        (section) => section.id !== sectionId
      ),
    });
  }

  function addSubsection(sectionId: string) {
    setTemplate((current) => ({
      ...current,
      sections: (current.sections || []).map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          subsections: [
            ...section.subsections,
            newSubsection(section.subsections.length),
          ],
        };
      }),
    }));
  }

  function removeSubsection(
    sectionId: string,
    subsectionId: string
  ) {
    setTemplate((current) => ({
      ...current,
      sections: (current.sections || []).map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.filter(
                (item) => item.id !== subsectionId
              ),
            }
          : section
      ),
    }));
  }

  function addQuestion(
    sectionId: string,
    subsectionId?: string
  ) {
    setTemplate((current) => ({
      ...current,
      sections: (current.sections || []).map((section) => {
        if (section.id !== sectionId) return section;

        if (!subsectionId) {
          return {
            ...section,
            questions: [
              ...section.questions,
              newQuestion(section.questions.length),
            ],
          };
        }

        return {
          ...section,
          subsections: section.subsections.map((subsection) =>
            subsection.id === subsectionId
              ? {
                  ...subsection,
                  questions: [
                    ...subsection.questions,
                    newQuestion(subsection.questions.length),
                  ],
                }
              : subsection
          ),
        };
      }),
    }));
  }

  function updateQuestion(
    sectionId: string,
    questionId: string,
    patch: Partial<AuditTemplateQuestion>,
    subsectionId?: string
  ) {
    setTemplate((current) => ({
      ...current,
      sections: (current.sections || []).map((section) => {
        if (section.id !== sectionId) return section;

        if (!subsectionId) {
          return {
            ...section,
            questions: section.questions.map((question) =>
              question.id === questionId
                ? { ...question, ...patch }
                : question
            ),
          };
        }

        return {
          ...section,
          subsections: section.subsections.map((subsection) =>
            subsection.id === subsectionId
              ? {
                  ...subsection,
                  questions: subsection.questions.map(
                    (question) =>
                      question.id === questionId
                        ? { ...question, ...patch }
                        : question
                  ),
                }
              : subsection
          ),
        };
      }),
    }));
  }

  function removeQuestion(
    sectionId: string,
    questionId: string,
    subsectionId?: string
  ) {
    updateQuestion(
      sectionId,
      questionId,
      { active: false },
      subsectionId
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!template.name?.trim()) {
      window.alert("Checklist adı daxil edilməlidir.");
      return;
    }

    if (!template.brandName?.trim()) {
      window.alert("Brend adı daxil edilməlidir.");
      return;
    }

    try {
      setSaving(true);

      if (id) {
        await updateAuditTemplate(id, template);
      } else {
        const created = await createAuditTemplate(template);
        navigate(`/app/audit/checklists/${created.id}`, {
          replace: true,
        });
        return;
      }

      window.alert("Checklist yadda saxlanıldı.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="audit-page">
        <div className="audit-card">
          Checklist yüklənir...
        </div>
      </div>
    );
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <Link
            to="/app/audit/checklists"
            className="audit-back-link"
          >
            <ArrowLeft size={16} />
            Checklistlər
          </Link>

          <h1>
            {id ? "Checklist redaktəsi" : "Yeni Audit Checklist"}
          </h1>

          <p>
            Bölmələri, alt bölmələri və audit suallarını idarə edin.
          </p>
        </div>

        <button
          form="audit-template-form"
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? "Yadda saxlanılır..." : "Yadda saxla"}
        </button>
      </div>

      <form id="audit-template-form" onSubmit={handleSubmit}>
        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>Template məlumatları</h2>
              <p>Bu məlumat audit checklist-in kimə aid olduğunu müəyyən edir.</p>
            </div>
          </div>

          <div className="audit-form-grid">
            <label>
              Şirkət / sahibkar
              <input
                value={template.organizationId || ""}
                onChange={(event) =>
                  setTemplate({
                    ...template,
                    organizationId: event.target.value,
                  })
                }
                placeholder="Məsələn: GFC"
              />
            </label>

            <label>
              Brend
              <input
                value={template.brandName || ""}
                onChange={(event) =>
                  setTemplate({
                    ...template,
                    brandName: event.target.value,
                  })
                }
                placeholder="Məsələn: KFC"
              />
            </label>

            <label>
              Checklist adı
              <input
                value={template.name || ""}
                onChange={(event) =>
                  setTemplate({
                    ...template,
                    name: event.target.value,
                  })
                }
                placeholder="Məsələn: KFC Servis Checklist"
              />
            </label>

            <label>
              Audit növü
              <select
                value={template.auditType}
                onChange={(event) =>
                  setTemplate({
                    ...template,
                    auditType: event.target.value as AuditTemplateType,
                  })
                }
              >
                <option value="service">Servis Auditi</option>
                <option value="standard">Standart Audit</option>
                <option value="occupational-safety">
                  Əməyin Mühafizəsi
                </option>
              </select>
            </label>

            <label>
              Versiya
              <input
                value={template.version || "1.0"}
                onChange={(event) =>
                  setTemplate({
                    ...template,
                    version: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Status
              <select
                value={template.status}
                onChange={(event) =>
                  setTemplate({
                    ...template,
                    status: event.target.value as AuditTemplate["status"],
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Aktiv</option>
                <option value="archived">Arxiv</option>
              </select>
            </label>
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>Source sənədlər</h2>
              <p>
                Audit üçün istifadə ediləcək PDF və digər sənədləri əlavə edin.
              </p>
            </div>
          </div>

          <div className="audit-form-grid">
            <label>
              Sənəd yüklə
              <input
                type="file"
                onChange={handleDocumentUpload}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="audit-builder-list">
            {documents.map((document) => (
              <label
                key={document.id}
                className="audit-builder-check"
              >
                <input
                  type="checkbox"
                  checked={
                    template.sourceDocumentIds?.includes(
                      document.id
                    ) || false
                  }
                  onChange={() =>
                    toggleSourceDocument(document.id)
                  }
                />
                <span>{document.originalName}</span>

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    removeSourceDocument(document.id);
                  }}
                  className="audit-delete-button"
                >
                  Sil
                </button>


              </label>
            ))}

            {documents.length === 0 && (
              <div className="audit-builder-empty">
                Hələ source sənəd yoxdur.
              </div>
            )}
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>Checklist strukturu</h2>
              <p>
                Bölmələri istədiyiniz kimi yaradın və sonradan dəyişdirin.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={addSection}
            >
              <Plus size={17} />
              Bölmə əlavə et
            </button>
          </div>

          <div className="audit-builder-list">
            {(template.sections || []).map((section) => {
              const isOpen = openSections[section.id] ?? true;

              return (
                <div
                  key={section.id}
                  className="audit-builder-section"
                >
                  <div className="audit-builder-section-header">
                    <button
                      type="button"
                      className="audit-builder-toggle"
                      onClick={() =>
                        setOpenSections({
                          ...openSections,
                          [section.id]: !isOpen,
                        })
                      }
                    >
                      {isOpen ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>

                    <input
                      value={section.title}
                      onChange={(event) =>
                        updateSection(section.id, {
                          title: event.target.value,
                        })
                      }
                      className="audit-builder-title-input"
                    />

                    <button
                      type="button"
                      className="audit-icon-danger"
                      onClick={() => removeSection(section.id)}
                      title="Bölməni sil"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="audit-builder-content">
                      {section.questions.map((question) => (
                        <QuestionEditor
                          key={question.id}
                          question={question}
                          onChange={(patch) =>
                            updateQuestion(
                              section.id,
                              question.id,
                              patch
                            )
                          }
                          onDelete={() =>
                            removeQuestion(
                              section.id,
                              question.id
                            )
                          }
                        />
                      ))}

                      {section.subsections.map((subsection) => (
                        <div
                          key={subsection.id}
                          className="audit-builder-subsection"
                        >
                          <div className="audit-builder-subsection-header">
                            <input
                              value={subsection.title}
                              onChange={(event) =>
                                setTemplate((current) => ({
                                  ...current,
                                  sections: (
                                    current.sections || []
                                  ).map((item) =>
                                    item.id === section.id
                                      ? {
                                          ...item,
                                          subsections:
                                            item.subsections.map(
                                              (sub) =>
                                                sub.id ===
                                                subsection.id
                                                  ? {
                                                      ...sub,
                                                      title:
                                                        event.target
                                                          .value,
                                                    }
                                                  : sub
                                            ),
                                        }
                                      : item
                                  ),
                                }))
                              }
                            />

                            <button
                              type="button"
                              className="audit-icon-danger"
                              onClick={() =>
                                removeSubsection(
                                  section.id,
                                  subsection.id
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {subsection.questions.map((question) => (
                            <QuestionEditor
                              key={question.id}
                              question={question}
                              onChange={(patch) =>
                                updateQuestion(
                                  section.id,
                                  question.id,
                                  patch,
                                  subsection.id
                                )
                              }
                              onDelete={() =>
                                removeQuestion(
                                  section.id,
                                  question.id,
                                  subsection.id
                                )
                              }
                            />
                          ))}

                          <button
                            type="button"
                            className="audit-builder-add"
                            onClick={() =>
                              addQuestion(
                                section.id,
                                subsection.id
                              )
                            }
                          >
                            <Plus size={15} />
                            Sual əlavə et
                          </button>
                        </div>
                      ))}

                      <div className="audit-builder-footer-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            addSubsection(section.id)
                          }
                        >
                          <Plus size={15} />
                          Alt bölmə
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            addQuestion(section.id)
                          }
                        >
                          <Plus size={15} />
                          Birbaşa sual
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {(template.sections || []).length === 0 && (
              <div className="audit-builder-empty">
                Hələ bölmə yoxdur. Yuxarıdakı düymə ilə ilk bölməni əlavə edin.
              </div>
            )}
          </div>
        </section>
      </form>
    </div>
  );
}

function QuestionEditor({
  question,
  onChange,
  onDelete,
}: {
  question: AuditTemplateQuestion;
  onChange: (patch: Partial<AuditTemplateQuestion>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="audit-builder-question">
      <input
        value={question.label}
        onChange={(event) =>
          onChange({ label: event.target.value })
        }
        placeholder="Audit sualı"
      />

      <select
        value={question.answerType}
        onChange={(event) =>
          onChange({
            answerType:
              event.target.value as AuditTemplateQuestion["answerType"],
          })
        }
      >
        <option value="yes-no-na">Bəli / Xeyr / N/A</option>
        <option value="severity">
          Compliant / Minor / Major / Critical
        </option>
        <option value="score">BAL</option>
        <option value="text">Mətn</option>
      </select>

      <label className="audit-builder-check">
        <input
          type="checkbox"
          checked={question.required}
          onChange={(event) =>
            onChange({ required: event.target.checked })
          }
        />
        Məcburi
      </label>

      <label className="audit-builder-check">
        <input
          type="checkbox"
          checked={question.active}
          onChange={(event) =>
            onChange({ active: event.target.checked })
          }
        />
        Aktiv
      </label>

      <button
        type="button"
        className="audit-icon-danger"
        onClick={onDelete}
        title="Sualı deaktiv et"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
