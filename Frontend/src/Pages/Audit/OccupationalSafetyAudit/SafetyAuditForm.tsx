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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!restaurantId.trim()) {
      window.alert("Restoran seçilməlidir.");
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

    createOccupationalSafetyAudit(audit);

    navigate("/app/audit/safety");
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>Yeni Əməyin Mühafizəsi Auditi</h1>
          <p>
            Təhlükəsizlik və əməyin mühafizəsi standartlarını yoxlayın.
          </p>
        </div>

        <strong>
          {scorePercentage.toFixed(1)}%
        </strong>
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
          </div>
        </section>

        <section className="audit-card">
          <div className="audit-section-header">
            <div>
              <h2>Yoxlamalar</h2>
              <p>
                Hər yoxlama üçün Qeyd və BAL daxil edin.
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
                  Bu bölmə üçün yoxlama kriteriyaları hələ əlavə edilməyib.
                </div>
              ) : (
                <div className="audit-safety-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Əlavə yoxlamalar və suallar</th>
                        <th>Qeyd</th>
                        <th>BAL</th>
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
                                placeholder="Qeyd"
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
                                placeholder="0–5"
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
          <h2>Bal sistemi</h2>

          <p>0 — Uyğun deyil</p>
          <p>1–2 — Zəif</p>
          <p>3 — Qismən uyğun</p>
          <p>4 — Yaxşı</p>
          <p>5 — Tam uyğun</p>
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
