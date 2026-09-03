import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, BarChart3, Gauge, Store, TrendingUp } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import { getAuditAnalytics, type AuditAnalytics as AuditAnalyticsData } from "../../../Services/analyticsService";

const EMPTY: AuditAnalyticsData = {
  overallScore: 0,
  totalAudits: 0,
  restaurantsAudited: 0,
  criticalCount: 0,
  restaurantComparison: [],
  categoryAnalysis: [],
  historicalTrend: [],
};

const AuditAnalytics: React.FC = () => {
  const [data, setData] = useState<AuditAnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    {
      label: "Overall score",
      value: `${data.overallScore.toFixed(1)} / 10`,
      icon: Gauge,
      accent: "#6366f1",
      accentBg: "rgba(99,102,241,0.12)",
    },
    {
      label: "Total audits",
      value: data.totalAudits,
      icon: BarChart3,
      accent: "#0ea5e9",
      accentBg: "rgba(14,165,233,0.12)",
    },
    {
      label: "Restaurants audited",
      value: data.restaurantsAudited,
      icon: Store,
      accent: "#22c55e",
      accentBg: "rgba(34,197,94,0.12)",
    },
    {
      label: "Critical / low scores",
      value: data.criticalCount,
      icon: AlertTriangle,
      accent: "#f59e0b",
      accentBg: "rgba(245,158,11,0.12)",
    },
  ];

  return (
    <div>
      <PageHeader title="Audit analytics" subtitle="Performance across the restaurant network." />

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : data.totalAudits === 0 ? (
        <div className="chart-empty">
          <TrendingUp size={22} />
          <p>No audits yet — analytics will appear once audits are submitted.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div className="kpi-card anim-in" key={kpi.label} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="kpi-card__icon" style={{ background: kpi.accentBg }}>
                    <Icon size={18} color={kpi.accent} />
                  </div>
                  <p className="kpi-card__label">{kpi.label}</p>
                  <p className="kpi-card__value">{kpi.value}</p>
                </div>
              );
            })}
          </div>

          <div className="charts-grid">
            <div className="chart-card anim-in">
              <div className="chart-card__header">
                <h3>Restaurant comparison</h3>
                <span className="chart-card__hint">Average overall score</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.restaurantComparison} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8b90a8" }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#8b90a8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid rgba(26,29,46,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card anim-in" style={{ animationDelay: "0.06s" }}>
              <div className="chart-card__header">
                <h3>Category analysis</h3>
                <span className="chart-card__hint">Network average</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.categoryAnalysis} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "#8b90a8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 12, fill: "#4b5063" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(26,29,46,0.08)", fontSize: 12 }} />
                  <Bar dataKey="score" fill="#8b5cf6" radius={[0, 6, 6, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card anim-in" style={{ animationDelay: "0.1s" }}>
            <div className="chart-card__header">
              <h3>Historical trend</h3>
              <span className="chart-card__hint">Monthly average score</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.historicalTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,29,46,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b90a8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#8b90a8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(26,29,46,0.08)", fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={900} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditAnalytics;
