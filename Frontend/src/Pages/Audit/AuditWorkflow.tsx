import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../Context/useAuth";
import { hasPermission } from "../../Utils/permissions";
interface Item {
  _id: string;
  status: string;
  title?: string;
  reviewer?: string;
  requestedBy?: string;
  comment?: string;
  totalScore?: number;
  verificationNote?: string;
}
interface Person {
  _id: string;
  name: string;
  role: string;
}
interface Audit {
  _id: string;
  id: string;
  status: string;
  auditType: string;
  auditorId: string;
  metadata?: { legacyUnverified?: boolean };
}
export default function AuditWorkflow() {
  const { id } = useParams();
  const { user } = useAuth();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [findings, setFindings] = useState<Item[]>([]);
  const [actions, setActions] = useState<Item[]>([]);
  const [executions, setExecutions] = useState<Item[]>([]);
  const [approvals, setApprovals] = useState<Item[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [auditors, setAuditors] = useState<Person[]>([]);
  const [reviewer, setReviewer] = useState("");
  const [assignee, setAssignee] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const permission = (r: string, a: string) => hasPermission(user, r, a);
  const load = useCallback(async () => {
    const a = (await api.get<Audit>(`/audits/${id}`)).data;
    setAudit(a);
    const read = async (resource: string, url: string) =>
      hasPermission(user, resource, "read")
        ? (await api.get<{ data: Item[] }>(url)).data.data
        : [];
    const [f, ac, e, ap, persons] = await Promise.all([
      read("audit.finding", `/audit-findings/${a._id}`),
      read("audit.action", `/audit-actions/audit/${a._id}`),
      read("audit.execution", `/audit-execution/audit/${a._id}`),
      read("audit.approval", `/audit-approval/${a._id}`),
      api.get<Person[]>("/audit-reviewers"),
    ]);
    setFindings(f);
    setActions(ac);
    setExecutions(e);
    setApprovals(ap);
    setPeople(
      persons.data.filter((p) => p._id !== user?.id && p._id !== a.auditorId),
    );
    if (["admin", "audit_manager"].includes(user?.role || ""))
      setAuditors((await api.get<Person[]>("/audit-auditors")).data);
  }, [id, user]);
  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(load)
      .catch((e) => {
        if (mounted) setError(e.response?.data?.message || e.message);
      });
    return () => {
      mounted = false;
    };
  }, [load]);
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      const x = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(x.response?.data?.message || x.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  if (!audit)
    return (
      <div>{error ? <p role="alert">{error}</p> : <p>Loading audit…</p>}</div>
    );
  const locked = ["completed", "cancelled"].includes(audit.status);
  const nextFinding: Record<string, string> = {
    open: "in-progress",
    assigned: "in-progress",
    "in-progress": "resolved",
    resolved: "closed",
  };
  const nextAction: Record<string, string> = {
    open: "in-progress",
    "in-progress": "completed",
    completed: "verified",
    rejected: "in-progress",
  };
  return (
    <div className="page-container">
      <h1>Audit workflow</h1>
      <p>
        {audit.auditType} · {audit.status}
      </p>
      {audit.metadata?.legacyUnverified && (
        <p role="alert">
          Historical completion: no independently verified closure record
          exists. Review this audit before relying on its result.
        </p>
      )}
      <p>
        Complete an execution, resolve findings, verify actions, then request an
        independent review. Any later change requires a new approval.
      </p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <fieldset
        disabled={busy || locked}
        style={{ padding: 20, marginBottom: 20 }}
      >
        <legend>Audit progress</legend>
        {permission("audit.workflow", "update") &&
          ["draft", "scheduled"].includes(audit.status) && (
            <button
              className="btn-primary"
              onClick={() =>
                void perform(() =>
                  api.patch(`/audit-workflow/${audit._id}/status`, {
                    status: "in-progress",
                  }),
                )
              }
            >
              Start audit
            </button>
          )}
        {permission("audit.execution", "create") &&
          audit.status === "in-progress" && (
            <button
              className="btn-secondary"
              onClick={() =>
                void perform(() =>
                  api.post("/audit-execution", { auditId: audit._id }),
                )
              }
            >
              Create execution
            </button>
          )}
        {permission("audit.closure", "update") && (
          <button
            className="btn-primary"
            onClick={() =>
              void perform(() =>
                api.post("/audit-closure", {
                  auditId: audit._id,
                  comment: note,
                }),
              )
            }
          >
            Close approved audit
          </button>
        )}
        {auditors.length > 0 && (
          <div>
            <label>
              Assign auditor{" "}
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Choose auditor</option>
                {auditors.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!assignee}
              onClick={() =>
                void perform(() =>
                  api.post("/audit-assignments", {
                    auditId: audit._id,
                    auditor: assignee,
                  }),
                )
              }
            >
              Assign
            </button>
          </div>
        )}
      </fieldset>
      <h2>Executions</h2>
      {executions.length ? (
        executions.map((e) => (
          <p key={e._id}>
            <Link to={`/app/audit/execution/${e._id}`}>
              {e.status} execution
            </Link>{" "}
            · score {e.totalScore ?? 0}%
          </p>
        ))
      ) : (
        <p>No execution yet.</p>
      )}
      <fieldset
        disabled={busy || locked}
        style={{ padding: 20, margin: "20px 0" }}
      >
        <legend>Findings and corrective actions</legend>
        <label>
          Title{" "}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
          />
        </label>
        <label>
          Resolution / verification / review note{" "}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={5000}
          />
        </label>
        {permission("audit.finding", "create") && (
          <button
            disabled={!title.trim()}
            onClick={() =>
              void perform(() =>
                api.post("/audit-findings", {
                  auditId: audit._id,
                  title,
                  description: note,
                }),
              )
            }
          >
            Add finding
          </button>
        )}
        {permission("audit.action", "create") && (
          <button
            disabled={!title.trim()}
            onClick={() =>
              void perform(() =>
                api.post("/audit-actions", {
                  auditId: audit._id,
                  title,
                  description: note,
                }),
              )
            }
          >
            Add action
          </button>
        )}
        <h3>Findings</h3>
        {findings.map((f) => (
          <p key={f._id}>
            {f.title} — {f.status}{" "}
            {permission("audit.finding", "update") && nextFinding[f.status] && (
              <button
                onClick={() =>
                  void perform(() =>
                    api.patch(`/audit-findings/${f._id}`, {
                      status: nextFinding[f.status],
                      resolution: note,
                    }),
                  )
                }
              >
                Mark {nextFinding[f.status]}
              </button>
            )}
          </p>
        ))}
        <h3>Actions</h3>
        {actions.map((a) => (
          <p key={a._id}>
            {a.title} — {a.status}{" "}
            {permission("audit.action", "update") && nextAction[a.status] && (
              <button
                onClick={() =>
                  void perform(() =>
                    api.put(`/audit-actions/${a._id}/status`, {
                      status: nextAction[a.status],
                      verificationNote: note,
                    }),
                  )
                }
              >
                Mark {nextAction[a.status]}
              </button>
            )}
          </p>
        ))}
      </fieldset>
      <fieldset disabled={busy || locked} style={{ padding: 20 }}>
        <legend>Independent approval</legend>
        {permission("audit.approval", "create") && (
          <>
            <label>
              Reviewer{" "}
              <select
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
              >
                <option value="">Choose reviewer</option>
                {people.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!reviewer}
              onClick={() =>
                void perform(() =>
                  api.post("/audit-approval", { auditId: audit._id, reviewer }),
                )
              }
            >
              Request review
            </button>
          </>
        )}
        {approvals.map((a) => (
          <div key={a._id}>
            <p>
              {a.status} {a.comment}
            </p>
            {a.status === "pending" &&
              a.reviewer === user?.id &&
              permission("audit.approval", "update") && (
                <>
                  {["approved", "rejected"].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        void perform(() =>
                          api.patch(`/audit-approval/${a._id}`, {
                            status,
                            comment: note,
                          }),
                        )
                      }
                    >
                      {status === "approved" ? "Approve" : "Reject"}
                    </button>
                  ))}
                </>
              )}
          </div>
        ))}
      </fieldset>
    </div>
  );
}
