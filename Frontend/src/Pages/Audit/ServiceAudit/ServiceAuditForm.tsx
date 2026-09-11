import "../auditModern.css";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      window.alert(t("audit.service.form.restaurantRequired"));
      return;
    }

    setSubmitting(true);

    if (!template) {
      window.alert(t("audit.service.form.templateNotFound"));
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
          <h1>{t("audit.service.form.title")}</h1>
          <p>{t("audit.service.form.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="audit-card">
          <h2>{t("audit.service.form.auditInformation")}</h2>

          <div className="audit-form-grid">
            <label>
              {t("audit.service.form.restaurant")}
              <input
                value={restaurantId}
                onChange={(event) =>
                  setRestaurantId(event.target.value)
                }
                placeholder={t("audit.service.form.restaurantPlaceholder")}
                required
              />
            </label>

            <label>
              {t("audit.service.form.auditDate")}
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
              {t("audit.service.form.shift")}
              <select
                value={shift}
                onChange={(event) =>
                  setShift(event.target.value)
                }
              >
                <option value="Səhər">{t("audit.service.form.morning")}</option>
                <option value="Günorta">{t("audit.service.form.afternoon")}</option>
                <option value="Axşam">{t("audit.service.form.evening")}</option>
                <option value="Gecə">{t("audit.service.form.night")}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>{t("audit.service.form.serviceChecks")}</h2>
              <p>
                {t("audit.service.form.serviceChecksHint")}
              </p>
            </div>

            <strong>{percentage.toFixed(1)}%</strong>
          </div>

          {checklistSections.map((section) => (
            <div key={section.id} className="audit-checklist-section">
              <h3>{section.title}</h3>

              {section.items.length === 0 ? (
                <div className="audit-empty-state">
                  {t("audit.service.form.noCriteriaConfigured")}
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
                                ? t("audit.service.detail.yes")
                                : answer === "no"
                                ? t("audit.service.detail.no")
                                : t("audit.service.detail.notApplicable")}
                            </label>
                          )
                        )}
                      </div>

                      <input
                        value={result?.comment ?? ""}
                        onChange={(event) =>
                          setComment(item.id, event.target.value)
                        }
                        placeholder={t("audit.service.form.comment")}
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
              <h2>{t("audit.service.form.serviceTime")}</h2>
              <p>
                {t("audit.service.form.serviceTimeHint")}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={addObservation}
            >
              {t("audit.service.form.addGuest")}
            </button>
          </div>

          {observations.map((observation, index) => (
            <div
              key={`${index}-${observation.guestNumber}`}
              className="audit-observation-row"
            >
              <strong>{t("audit.service.detail.guest", { number: index + 1 })}</strong>

              <label>
                {t("audit.service.form.timeSeconds")}
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
                {t("audit.service.form.comment")}
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
          <h2>{t("audit.service.form.recommendations")}</h2>

          <textarea
            rows={5}
            value={recommendations}
            onChange={(event) =>
              setRecommendations(event.target.value)
            }
            placeholder={t("audit.service.form.recommendationsPlaceholder")}
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
