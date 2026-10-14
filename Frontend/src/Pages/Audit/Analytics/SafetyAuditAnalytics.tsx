import "../auditModern.css";
import { useTranslation } from "react-i18next";
import "../auditAnalytics.css";

import React from "react";
import { useAuditResource } from "../../../Hooks/useAuditResource";

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

import {
  BarChart3,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import { getSafetyAnalytics } from "../../../Services/auditAnalyticsService";
import { ACCENT } from "../../../Utils/theme";

const loadAnalytics = (_id: string, signal?: AbortSignal, scopeKey?: string) => getSafetyAnalytics(signal,scopeKey);

const SafetyAuditAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const resource = useAuditResource('safety','audit.analytics',loadAnalytics);
  const data = resource.data?.data;
  const loading = resource.status === 'loading';
  const error = resource.status !== 'ready' && !loading ? t('audit.safety.analytics.error') : '';

  return (
    <div className="audit-analytics safety-audit-analytics">
      <PageHeader
        title={t("audit.safety.analytics.title")}
        subtitle={t("audit.safety.analytics.subtitle")}
      />

      {loading && (
        <div className="audit-modern-empty">
          {t("audit.safety.analytics.loading")}
        </div>
      )}

      {!loading && error && (
        <div className="audit-modern-empty">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <BarChart3 size={22} />
              <p>{t("audit.safety.analytics.totalAudits")}</p>
              <h2>{data.total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />
              <p>{t("audit.safety.analytics.averageScore")}</p>
              <h2>
                {(data.averageScorePercentage === null ? "—" : data.averageScorePercentage.toFixed(1))} %
              </h2>
            </div>

            <div className="kpi-card">
              <CheckCircle2 size={22} />
              <p>{t("audit.safety.analytics.answeredChecks")}</p>
              <h2>
                {data.answered}/{data.totalChecks}
              </h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="audit-modern-card">
              <h3>{t("audit.safety.analytics.scoreDistribution")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.distribution}
                  margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="rgba(148, 163, 184, 0.13)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.24)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(99, 102, 241, 0.045)" }}
                  />
                  <Bar
                    dataKey="value"
                    fill={ACCENT}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="audit-modern-card">
              <h3>{t("audit.safety.analytics.trend")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={data.trend}
                  margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="rgba(148, 163, 184, 0.13)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.24)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(99, 102, 241, 0.18)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={ACCENT}
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SafetyAuditAnalytics;
