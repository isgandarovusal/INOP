import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../Context/useAuth";
import { canAccessSection } from "../../Utils/permissions";
interface Summary {
  jobs: number;
  candidates: number;
  applications: number;
  audits: number;
  recentCandidates: { _id: string; name: string; role: string }[];
  statuses: { _id: string; count: number }[];
}
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get<Summary>("/dashboard")
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setError("Dashboard could not be loaded");
      });
    return () => {
      active = false;
    };
  }, []);
  if (!user) return null;
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Your operations overview</p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Loading…</p>}
      {data && (
        <>
          <div className="kpi-grid">
            {canAccessSection(user, "recruitment") &&
              [
                ["Jobs", data.jobs],
                ["Candidates", data.candidates],
                ["Applications", data.applications],
              ].map(([name, count]) => (
                <div className="kpi-card" key={name}>
                  <p className="kpi-card__label">{name}</p>
                  <p className="kpi-card__value">{count}</p>
                </div>
              ))}
            {canAccessSection(user, "audit") && (
              <div className="kpi-card">
                <p className="kpi-card__label">Audits</p>
                <p className="kpi-card__value">{data.audits}</p>
                <Link to="/app/audit/audits">Open audits</Link>
              </div>
            )}
          </div>
          {canAccessSection(user, "recruitment") && (
            <>
              <h2>Application pipeline</h2>
              <div className="kpi-grid">
                {data.statuses.map((s) => (
                  <div className="kpi-card" key={s._id}>
                    {s._id}: {s.count}
                  </div>
                ))}
              </div>
              <h2>Recent candidates</h2>
              {data.recentCandidates.map((c) => (
                <p key={c._id}>
                  <Link to={`/app/recruitment/candidates/${c._id}`}>
                    {c.name}
                  </Link>{" "}
                  · {c.role}
                </p>
              ))}
              {!data.recentCandidates.length && <p>No candidates yet.</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
