import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStandardAudit } from "../../../Services/standardAuditsService";
import { standardAuditChecklist } from "../../../Config/Audit/standardAuditChecklist";
import type {
  StandardAudit,
  StandardChecklistResult,
  StandardResult,
} from "../../../Types/Audit";

const RESULTS: StandardResult[] = [
  "compliant",
  "minor",
  "major",
  "critical",
];

const RESULT_LABELS: Record<StandardResult, string> = {
  compliant: "COMPLIANT",
  minor: "MINOR",
  major: "MAJOR",
  critical: "CRITICAL",
};

export default function StandardAuditForm() {
  const navigate = useNavigate();

  const [restaurantId, setRestaurantId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [shift, setShift] = useState("Səhər");

  const [results, setResults] = useState<StandardChecklistResult[]>(
    []
  );

  const [submitting, setSubmitting] = useState(false);

  const allItems = useMemo(
    () =>
      standardAuditChecklist.flatMap((category) =>
        category.subsections.flatMap((subsection) =>
          subsection.items.map((item) => ({
            item,
            categoryId: category.id,
            subsectionId: subsection.id,
          }))
        )
      ),
    []
  );

  const foundCritical = results.filter(
    (result) => result.result === "critical"
  ).length;

  const foundMajor = results.filter(
    (result) => result.result === "major"
  ).length;

  const foundMinor = results.filter(
    (result) => result.result === "minor"
  ).length;

  const foundTotal = foundCritical + foundMajor + foundMinor;

  const compliancePercentage =
    allItems.length > 0
      ? ((allItems.length - foundTotal) / allItems.length) * 100
      : 0;

  const passed = foundCritical === 0 && foundMajor === 0;

  function setResult(
    checkId: string,
    categoryId: string,
    subsectionId: string,
    result: StandardResult
  ) {
    setResults((current) => {
      const existing = current.find(
        (item) => item.checkId === checkId
      );

      if (existing) {
        return current.map((item) =>
          item.checkId === checkId
            ? { ...item, result }
            : item
        );
      }

      return [
        ...current,
        {
          checkId,
          categoryId,
          subsectionId,
          result,
          finding: "",
          correctiveAction: "",
        },
      ];
    });
  }

  function updateText(
    checkId: string,
    field: "finding" | "correctiveAction",
    value: string
  ) {
    setResults((current) =>
      current.map((item) =>
        item.checkId === checkId
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!restaurantId.trim()) {
      window.alert("Restoran seçilməlidir.");
      return;
    }

    setSubmitting(true);

    const categories = standardAuditChecklist.map((category) => ({
      id: category.id,
      name: category.title,
      total: category.subsections.reduce(
        (sum, subsection) => sum + subsection.expected.total,
        0
      ),
      critical: category.subsections.reduce(
        (sum, subsection) => sum + subsection.expected.critical,
        0
      ),
      major: category.subsections.reduce(
        (sum, subsection) => sum + subsection.expected.major,
        0
      ),
      minor: category.subsections.reduce(
        (sum, subsection) => sum + subsection.expected.minor,
        0
      ),
      subsections: category.subsections.map((subsection) => ({
        id: subsection.id,
        name: subsection.title,
        total: subsection.expected.total,
        critical: subsection.expected.critical,
        major: subsection.expected.major,
        minor: subsection.expected.minor,
      })),
    }));

    const audit: Omit<
      StandardAudit,
      "id" | "auditorId" | "createdAt"
    > = {
      type: "standard",
      restaurantId: restaurantId.trim(),
      date,
      shift,
      status: passed ? "completed" : "failed",
      results,
      categories,
      findings: [],
      foundCritical,
      foundMajor,
      foundMinor,
      foundTotal,
      compliancePercentage,
      passed,
    };

    try {
      await createStandardAudit(audit);
    } catch (error) {
      console.error("Standard audit creation failed:", error);
      window.alert("Audit yadda saxlanarkən xəta baş verdi.");
      setSubmitting(false);
      return;
    }

    navigate("/app/audit/standard");
  }

  return (
    <div className="audit-page">
      <div className="audit-page-header">
        <div>
          <h1>Yeni Standart Audit</h1>
          <p>
            Qida təhlükəsizliyi və brend standartlarını yoxlayın.
          </p>
        </div>

        <div>
          <strong>
            {passed ? "PASSED" : "FAILED"}
          </strong>
          {" · "}
          {compliancePercentage.toFixed(1)}%
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="audit-card">
          <h2>Restoran məlumatları</h2>

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
          <h2>Uyğunsuzluq xülasəsi</h2>

          <div className="audit-summary-grid">
            <div>
              <strong>{allItems.length}</strong>
              <span>Ümumi</span>
            </div>

            <div>
              <strong>{foundCritical}</strong>
              <span>🔴 CRITICAL</span>
            </div>

            <div>
              <strong>{foundMajor}</strong>
              <span>🟠 MAJOR</span>
            </div>

            <div>
              <strong>{foundMinor}</strong>
              <span>🟡 MINOR</span>
            </div>

            <div>
              <strong>{foundTotal}</strong>
              <span>Tapılan cəmi</span>
            </div>

            <div>
              <strong>
                {compliancePercentage.toFixed(1)}%
              </strong>
              <span>Uyğunluq</span>
            </div>
          </div>
        </section>

        {standardAuditChecklist.map((category) => (
          <section
            key={category.id}
            className="audit-card"
          >
            <h2>{category.title}</h2>

            {category.subsections.map((subsection) => (
              <div
                key={subsection.id}
                className="audit-checklist-section"
              >
                <div className="audit-section-header">
                  <h3>{subsection.title}</h3>

                  <span>
                    {subsection.expected.total} sual ·{" "}
                    {subsection.expected.critical} Critical ·{" "}
                    {subsection.expected.major} Major ·{" "}
                    {subsection.expected.minor} Minor
                  </span>
                </div>

                {subsection.items.length === 0 ? (
                  <div className="audit-empty-state">
                    Bu bölmənin kriteriyaları hələ əlavə edilməyib.
                  </div>
                ) : (
                  subsection.items.map((item) => {
                    const result = results.find(
                      (entry) => entry.checkId === item.id
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
                          {RESULTS.map((value) => (
                            <label key={value}>
                              <input
                                type="radio"
                                name={item.id}
                                checked={
                                  result?.result === value
                                }
                                onChange={() =>
                                  setResult(
                                    item.id,
                                    category.id,
                                    subsection.id,
                                    value
                                  )
                                }
                              />

                              {RESULT_LABELS[value]}
                            </label>
                          ))}
                        </div>

                        {result &&
                          result.result !== "compliant" && (
                            <>
                              <input
                                value={result.finding}
                                onChange={(event) =>
                                  updateText(
                                    item.id,
                                    "finding",
                                    event.target.value
                                  )
                                }
                                placeholder="Aşkar edilmiş uyğunsuzluq"
                              />

                              <input
                                value={result.correctiveAction}
                                onChange={(event) =>
                                  updateText(
                                    item.id,
                                    "correctiveAction",
                                    event.target.value
                                  )
                                }
                                placeholder="Düzəldici tədbir"
                              />
                            </>
                          )}
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </section>
        ))}

        <section className="audit-card">
          <h2>Qiymətləndirmə</h2>

          <p>
            🔴 Critical — dərhal fəaliyyət tələb olunur
          </p>
          <p>
            🟠 Major — sistemli uyğunsuzluq
          </p>
          <p>
            🟡 Minor — aşağı riskli uyğunsuzluq
          </p>
          <p>
            🟢 Compliant — standarta uyğundur
          </p>
        </section>

        <div className="audit-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/app/audit/standard")}
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
