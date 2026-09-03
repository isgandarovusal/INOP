import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import PageHeader from "../../Components/PageHeader";
import Badge from "../../Components/Badge";
import { getUsers } from "../../Services/usersService";
import type { PublicUser, Role } from "../../Types/auth";
import { ROLE_LABELS } from "../../Utils/permissions";

const ROLE_CAPABILITIES: Record<Role, string[]> = {
  admin: ["Users", "Roles", "Departments", "System-level management"],
  hr: ["Jobs", "Candidates", "Applications", "CVs", "Candidate filtering"],
  auditor: ["Restaurants", "Audits", "Scores", "Comments", "Attachments"],
  manager: ["Dashboard", "Audit analytics", "Reports / data viewing"],
};

const RolesOverview: React.FC = () => {
  const [users, setUsers] = useState<PublicUser[]>([]);

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const countFor = (role: Role) => users.filter((u) => u.role === role).length;

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Fixed roles with pre-defined permissions. Custom role management is on the future roadmap."
      />

      <div className="kpi-grid">
        {(Object.keys(ROLE_CAPABILITIES) as Role[]).map((role, idx) => (
          <div className="detail-card anim-in" key={role} style={{ animationDelay: `${idx * 0.05}s`, marginBottom: 0 }}>
            <h3>
              <ShieldCheck size={16} style={{ verticalAlign: "-3px", marginRight: 6, color: "var(--accent)" }} />
              {ROLE_LABELS[role]}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
              {countFor(role)} user{countFor(role) === 1 ? "" : "s"}
            </p>
            <div className="tag-list">
              {ROLE_CAPABILITIES[role].map((cap) => (
                <Badge tone="accent" key={cap}>
                  {cap}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesOverview;
