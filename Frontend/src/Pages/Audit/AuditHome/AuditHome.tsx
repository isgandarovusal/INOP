import { Link } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
  Wrench,
  ArrowRight,
} from "lucide-react";
import "./auditHome.css";

const auditItems = [
  {
    to: "/app/audit/analytics",
    title: "Analytics",
    description: "Audit nəticələrini, göstəriciləri və trendləri analiz edin.",
    icon: BarChart3,
  },
  {
    to: "/app/audit/standard",
    title: "Standard Audit",
    description: "Standart audit proseslərini yaradın və idarə edin.",
    icon: ClipboardCheck,
  },
  {
    to: "/app/audit/service",
    title: "Service Audit",
    description: "Xidmət keyfiyyəti üzrə auditləri qeyd edin və izləyin.",
    icon: Wrench,
  },
  {
    to: "/app/audit/safety",
    title: "Occupational Safety Audit",
    description: "Əməyin mühafizəsi və təhlükəsizlik auditlərini idarə edin.",
    icon: ShieldCheck,
  },
  {
    to: "/app/audit/checklists",
    title: "Checklists",
    description: "Audit üçün checklist-ləri yaradın və idarə edin.",
    icon: ClipboardList,
  },
];

export default function AuditHome() {
  return (
    <div className="audit-home">
      <div className="audit-home-header">
        <div>
          <span className="audit-home-eyebrow">AUDIT MANAGEMENT</span>
          <h1>Audit Management</h1>
          <p>
            Audit proseslərini vahid platformadan idarə edin və nəticələri
            daha rahat izləyin.
          </p>
        </div>
      </div>

      <div className="audit-home-grid">
        {auditItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.to} to={item.to} className="audit-home-card">
              <div className="audit-home-card-icon">
                <Icon size={24} strokeWidth={2} />
              </div>

              <div className="audit-home-card-content">
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>

              <div className="audit-home-card-action">
                <span>Open</span>
                <ArrowRight size={18} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
