import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createServiceAudit,
} from "../../../Services/serviceAuditsService";
import {
  getAuditTemplates,
} from "../../../Services/auditTemplatesService";
import type {
  AuditTemplate,
} from "../../../Types/Audit";
import type {
  ServiceAnswer,
  ServiceAudit,
  ServiceCheckResult,
  ServiceTimeObservation,
} from "../../../Types/Audit";

const emptyObservation = (): ServiceTimeObservation => ({
  guestNumber: 1,
  seconds: null,
  comment: "",
});

export default function ServiceAuditForm() {
  const navigate = useNavigate();

  const [restaurantId, setRestaurantId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [shift, setShift] = useState("Səhər");

  const [checks, setChecks] = useState<ServiceCheckResult[]>([]);
  const [observations, setObservations] = useState<
    ServiceTimeObservation[]
  >([emptyObservation()]);

  const [recommendations, setRecommendations] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [template, setTemplate] =
    useState<AuditTemplate | null>(null);

  useEffect(() => {
    const load = async () => {
getAuditTemplates({
      auditType: "service",
      status: "active",
    })
      .then((templates) => {
        if (templates.length > 0) {
          setTemplate(templates[0]);
        }
      })
      .catch((error) => {
        console.error(
          "Audit template yüklənmədi:",
          error
        );
      });
    };

    load();
  }, []);

  const checklistSections = useMemo(() => {
    if (!template) return [];

    return template.sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: [
        ...section.questions,
        ...section.subsections.flatMap(
          (subsection) => subsection.questions
        ),
      ],
    }));
  }, [template]);

  const totalAnswered = useMemo(
    () => checks.filter((check) => check.answer !== "na").length,
    [checks]
  );

  const positiveAnswers = useMemo(
    () => checks.filter((check) => check.answer === "yes").length,
    [checks]
  );

  const percentage =
    totalAnswered > 0
      ? (positiveAnswers / totalAnswered) * 100
      : 0;

  function setAnswer(checkId: string, answer: ServiceAnswer) {
    setChecks((current) => {
      const existing = current.find(
        (check) => check.checkId === checkId
      );

      if (existing) {
        return current.map((check) =>
          check.checkId === checkId
            ? { ...check, answer }
            : check
        );
      }

      return [
        ...current,
        {
          checkId,
          answer,
          comment: "",
        },
      ];
    });
  }

  function setComment(checkId: string, comment: string) {
    setChecks((current) => {
      const existing = current.find(
        (check) => check.checkId === checkId
      );

      if (existing) {
        return current.map((check) =>
          check.checkId === checkId
            ? { ...check, comment }
            : check
        );
      }

      return [
        ...current,
        {
          checkId,
          answer: "na",
          comment,
        },
      ];
    });
  }

  function updateObservation(
    index: number,
    field: keyof ServiceTimeObservation,
    value: string
  ) {
    setObservations((current) =>
      current.map((observation, i) => {
        if (i !== index) return observation;

        if (field === "guestNumber" || field === "seconds") {
          return {
            ...observation,
            [field]: value === "" ? null : Number(value),
          };
        }

        return {
          ...observation,
          [field]: value,
        };
      })
    );
  }

  function addObservation() {
    setObservations((current) => [
      ...current,
      {
        ...emptyObservation(),
        guestNumber: current.length + 1,
      },
    ]);
  }

  function removeObservation(index: number) {
    setObservations((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!restaurantId.trim()) {
      window.alert("Restoran seçilməlidir.");
      return;
    }

    setSubmitting(true);

    if (!template) {
      window.alert("Aktiv checklist template tapılmadı.");
      setSubmitting(false);
      return;
    }

    const audit: Omit<
      ServiceAudit,
      "id" | "auditorId" | "createdAt"
    > = {
      type: "service",

      templateId: template.id,

      templateSnapshot: {
        id: template.id,
        name: template.name,
        version: template.version,
        sections: template.sections.map((section) => ({
          id: section.id,
          title: section.title,
          questions: [
            ...section.questions,
            ...section.subsections.flatMap(
              (subsection) => subsection.questions
            ),
          ].map((question) => ({
            id: question.id,
            label: question.label,
            answerType: question.answerType,
          })),
        })),
      },
      restaurantId: restaurantId.trim(),
      date,
      shift,
      status: "completed",
      checks,
      serviceTimeObservations: observations,
      findings: [],
      overallPercentage: percentage,
      recommendations: recommendations
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    await createServiceAudit(audit);

    navigate("/app/audit/service");
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>Yeni Servis Auditi</h1>
          <p>
            Servis standartlarını və qonaq təcrübəsini qiymətləndirin.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="audit-card">
          <h2>Audit məlumatları</h2>

          <div className="audit-form-grid">
            <label>
              Restoran
              <input
                value={restaurantId}
                onChange={(event) =>
                  setRestaurantId(event.target.value)
                }
                placeholder="Restoran ID və ya adı"
                required
              />
            </label>

            <label>
              Audit tarixi
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                required
              />
            </label>

            <label>
              Növbə
              <select
                value={shift}
                onChange={(event) =>
                  setShift(event.target.value)
                }
              >
                <option>Səhər</option>
                <option>Günorta</option>
                <option>Axşam</option>
                <option>Gecə</option>
              </select>
            </label>
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>Servis yoxlamaları</h2>
              <p>
                Hər kriteriya üçün Bəli, Xeyr və ya N/A seçin.
              </p>
            </div>

            <strong>{percentage.toFixed(1)}%</strong>
          </div>

          {checklistSections.map((section) => (
            <div key={section.id} className="audit-checklist-section">
              <h3>{section.title}</h3>

              {section.items.length === 0 ? (
                <div className="audit-empty-state">
                  Bu bölmə üçün kriteriyalar hələ konfiqurasiya edilməyib.
                </div>
              ) : (
                section.items.map((item) => {
                  const result = checks.find(
                    (check) => check.checkId === item.id
                  );

                  return (
                    <div
                      key={item.id}
                      className="audit-check-row"
                    >
                      <div className="audit-check-label">
                        {item.label}
                      </div>

                      <div className="audit-answer-group">
                        {(["yes", "no", "na"] as ServiceAnswer[]).map(
                          (answer) => (
                            <label key={answer}>
                              <input
                                type="radio"
                                name={item.id}
                                checked={result?.answer === answer}
                                onChange={() =>
                                  setAnswer(item.id, answer)
                                }
                              />

                              {answer === "yes"
                                ? "Bəli"
                                : answer === "no"
                                ? "Xeyr"
                                : "N/A"}
                            </label>
                          )
                        )}
                      </div>

                      <input
                        value={result?.comment ?? ""}
                        onChange={(event) =>
                          setComment(item.id, event.target.value)
                        }
                        placeholder="Şərh"
                      />
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>Xidmət vaxtı</h2>
              <p>
                Qonaq müşahidələrinin sayı məhdud deyil.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={addObservation}
            >
              + Qonaq əlavə et
            </button>
          </div>

          {observations.map((observation, index) => (
            <div
              key={`${index}-${observation.guestNumber}`}
              className="audit-observation-row"
            >
              <strong>Qonaq {index + 1}</strong>

              <label>
                Vaxt (saniyə)
                <input
                  type="number"
                  min="0"
                  value={observation.seconds ?? ""}
                  onChange={(event) =>
                    updateObservation(
                      index,
                      "seconds",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Şərh
                <input
                  value={observation.comment}
                  onChange={(event) =>
                    updateObservation(
                      index,
                      "comment",
                      event.target.value
                    )
                  }
                />
              </label>

              {observations.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeObservation(index)}
                >
                  Sil
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="audit-card">
          <h2>Tövsiyələr</h2>

          <textarea
            rows={5}
            value={recommendations}
            onChange={(event) =>
              setRecommendations(event.target.value)
            }
            placeholder="Hər sətrə bir tövsiyə yazın..."
          />
        </section>

        <div className="audit-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/app/audit/service")}
          >
            Ləğv et
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            Auditi yadda saxla
          </button>
        </div>
      </form>
    </div>
  );
}
