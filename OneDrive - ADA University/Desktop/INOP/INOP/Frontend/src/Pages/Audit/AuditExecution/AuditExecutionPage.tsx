import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../api/axios";
interface Execution {
  _id: string;
  auditId: string;
  status: string;
  totalScore: number;
  checklist: {
    id: string;
    question: string;
    answerType: string;
    required: boolean;
  }[];
  answers: { questionId: string; answer: string }[];
}
export default function AuditExecutionPage() {
  const { id } = useParams();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get(`/audit-execution/${id}`)
      .then((r) => {
        if (active) {
          setExecution(r.data.data);
          setAnswers(
            r.data.data.answers.map((a: { answer: string }) => a.answer),
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.response?.data?.message || e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function submit() {
    if (!execution) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.put(`/audit-execution/${id}/submit`, {
        answers: execution.checklist.map((q, i) => ({
          questionId: q.id,
          answer: answers[i] || "",
        })),
      });
      setExecution(r.data.data);
    } catch (e) {
      const x = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(x.response?.data?.message || x.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1>Audit execution</h1>
      {error && <p role="alert">{error}</p>}
      {!execution ? (
        <p>Loading…</p>
      ) : (
        <>
          <Link to={`/app/audit/workflow/${execution.auditId}`}>
            Back to audit workflow
          </Link>
          <p>
            {execution.status} · {execution.totalScore}%
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={busy || execution.status === "completed"}>
              {execution.checklist.map((q, i) => (
                <div key={q.id} style={{ margin: "16px 0" }}>
                  <label>
                    {q.question}
                    {["yes-no-na", "severity"].includes(q.answerType) ? (
                      <select
                        required={q.required}
                        value={answers[i] || ""}
                        onChange={(e) =>
                          setAnswers((a) =>
                            Object.assign([...a], { [i]: e.target.value }),
                          )
                        }
                      >
                        <option value="">Choose answer</option>
                        {(q.answerType === "severity"
                          ? ["compliant", "minor", "major", "critical"]
                          : ["yes", "no", "na"]
                        ).map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={q.answerType === "score" ? "number" : "text"}
                        min={0}
                        max={5}
                        step={1}
                        required={q.required}
                        value={answers[i] || ""}
                        onChange={(e) =>
                          setAnswers((a) =>
                            Object.assign([...a], { [i]: e.target.value }),
                          )
                        }
                      />
                    )}
                  </label>
                </div>
              ))}
              <button type="submit">Submit execution</button>
            </fieldset>
          </form>
        </>
      )}
    </div>
  );
}
