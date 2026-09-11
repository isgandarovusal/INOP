import "../auditModern.css";
import { useTranslation } from "react-i18next";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOccupationalSafetyAudit } from "../../../Services/occupationalSafetyAuditsService";
import { occupationalSafetyChecklist } from "../../../Config/Audit/occupationalSafetyChecklist";
import type {
  OccupationalSafetyAudit,
  SafetyCheckResult,
} from "../../../Types/Audit";

export default function SafetyAuditForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [restaurantId, setRestaurantId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [shift, setShift] = useState("Səhər");
  const [checks, setChecks] = useState<SafetyCheckResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const totalScore = checks.reduce(
    (sum, check) => sum + (check.score ?? 0),
    0
  );

  const maxScore = checks.length * 5;

  const scorePercentage =
    maxScore > 0
      ? (totalScore / maxScore) * 100
      : 0;

  function updateCheck(
    checkId: string,
    field: "note" | "score",
    value: string
  ) {
    setChecks((current) => {
      const existing = current.find(
        (check) => check.checkId === checkId
      );

      if (existing) {
        return current.map((check) =>
          check.checkId === checkId
            ? {
                ...check,
                [field]:
                  field === "score"
                    ? value === ""
                      ? null
                      : Number(value)
                    : value,
              }
            : check
        );
      }

      return [
        ...current,
        {
          checkId,
          note: field === "note" ? value : "",
          score:
            field === "score"
              ? value === ""
                ? null
                : Number(value)
              : null,
        },
      ];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!restaurantId.trim()) {
      window.alert(t("audit.safety.form.restaurantRequired"));
      return;
    }

    setSubmitting(true);

    const audit: Omit<
      OccupationalSafetyAudit,
      "id" | "auditorId" | "createdAt"
    > = {
      type: "occupational-safety",
      restaurantId: restaurantId.trim(),
      date,
      shift,
      status: "completed",
      checks,
      findings: [],
      totalScore,
      maxScore,
      scorePercentage,
    };

    try {
      await createOccupationalSafetyAudit(audit);
      navigate("/app/audit/safety");
    } catch (error) {
      console.error("Safety audit creation failed:", error);
      window.alert(t("audit.safety.form.saveError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>{t("audit.safety.form.newTitle")}</h1>
          <p>{t("audit.safety.form.subtitle")}</p>
        </div>

        <strong>
          {scorePercentage.toFixed(1)}%
        </strong>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="audit-card">
          <h2>{t("audit.safety.form.auditInformation")}</h2>

          <div className="audit-form-grid">
            <label>
              {t("audit.safety.form.restaurant")}
              <input
                value={restaurantId}
                onChange={(event) =>
                  setRestaurantId(event.target.value)
                }
                placeholder={t("audit.safety.form.restaurantPlaceholder")}
                required
              />
            </label>

            <label>
              {t("audit.safety.form.shift")}
              <select
                value={shift}
                onChange={(event) =>
                  setShift(event.target.value)
                }
              >
                <option value="Səhər">{t("audit.safety.form.morning")}</option>
                <option value="Günorta">{t("audit.safety.form.afternoon")}</option>
                <option value="Axşam">{t("audit.safety.form.evening")}</option>
                <option value="Gecə">{t("audit.safety.form.night")}</option>
              </select>
            </label>

            <label>
              {t("audit.safety.form.auditDate")}
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                required
              />
            </label>
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>{t("audit.safety.form.checks")}</h2>
              <p>
                {t("audit.safety.form.checksDescription")}
              </p>
            </div>

            <strong>
              {totalScore} / {maxScore}
            </strong>
          </div>

          {occupationalSafetyChecklist.map((section) => (
            <div
              key={section.id}
              className="audit-checklist-section"
            >
              <h3>{section.title}</h3>

              {section.items.length === 0 ? (
                <div className="audit-empty-state">
                  {t("audit.safety.form.criteriaMissing")}
                </div>
              ) : (
                <div className="audit-safety-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>{t("audit.safety.form.additionalQuestions")}</th>
                        <th>{t("audit.safety.form.note")}</th>
                        <th>{t("audit.safety.form.score")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {section.items.map((item) => {
                        const result = checks.find(
                          (check) => check.checkId === item.id
                        );

                        return (
                          <tr key={item.id}>
                            <td>{item.label}</td>

                            <td>
                              <input
                                value={result?.note ?? ""}
                                onChange={(event) =>
                                  updateCheck(
                                    item.id,
                                    "note",
                                    event.target.value
                                  )
                                }
                                placeholder={t("audit.safety.form.notePlaceholder")}
                                className="audit-table-input"
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                max="5"
                                step="1"
                                value={result?.score ?? ""}
                                onChange={(event) =>
                                  updateCheck(
                                    item.id,
                                    "score",
                                    event.target.value
                                  )
                                }
                                placeholder={t("audit.safety.form.scorePlaceholder")}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="audit-card">
          <h2>{t("audit.safety.form.scoreSystem")}</h2>

          <p>0 — {t("audit.safety.form.notCompliant")}</p>
          <p>1–2 — {t("audit.safety.form.weak")}</p>
          <p>3 — {t("audit.safety.form.partiallyCompliant")}</p>
          <p>4 — {t("audit.safety.form.good")}</p>
          <p>5 — {t("audit.safety.form.fullyCompliant")}</p>
        </section>

        <div className="audit-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/app/audit/safety")}
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
