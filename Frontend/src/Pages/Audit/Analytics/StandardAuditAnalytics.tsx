import "../auditModern.css";
import { useTranslation } from "react-i18next";
import "../auditAnalytics.css";

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

import {
  BarChart3,
  CircleCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

import { ACCENT } from "../../../Utils/theme";

import PageHeader from "../../../Components/PageHeader";

import { getStandardAnalytics } from "../../../Services/auditAnalyticsService";
import type { StandardAnalyticsData } from "../../../Services/auditAnalyticsService";

const StandardAuditAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] =
    useState<StandardAnalyticsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getStandardAnalytics()
      .then((response) => {
        setData(response.data);
      })
      .catch((err) => {
        console.error(err);
        setError(t("audit.standard.analytics.error"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t]);

  const findings = data
    ? [
        {
          name: t("audit.standard.analytics.critical"),
          value: data.findings.critical,
        },
        {
          name: t("audit.standard.analytics.major"),
          value: data.findings.major,
        },
        {
          name: t("audit.standard.analytics.minor"),
          value: data.findings.minor,
        },
      ]
    : [];

  return (
    <div className="audit-analytics">
      <PageHeader
        title={t("audit.standard.analytics.title")}
        subtitle={t("audit.standard.analytics.subtitle")}
      />

      {loading && (
        <div className="audit-modern-empty">
          {t("audit.standard.analytics.loading")}
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
              <p>{t("audit.standard.analytics.totalAudits")}</p>
              <h2>{data.total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />
              <p>{t("audit.standard.analytics.averageCompliance")}</p>
              <h2>
                {data.averageCompliancePercentage.toFixed(1)}%
              </h2>
            </div>

            <div className="kpi-card">
              <CircleCheck size={22} />
              <p>{t("audit.standard.analytics.passedAudits")}</p>
              <h2>{data.passed}</h2>
            </div>

            <div className="kpi-card">
              <AlertTriangle size={22} />
              <p>{t("audit.standard.analytics.failedAudits")}</p>
              <h2>{data.failed}</h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="audit-modern-card">
              <h3>{t("audit.standard.analytics.findingsDistribution")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={findings}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(148,163,184,.24)" }}
                    tickLine={false}
                    tickMargin={10}
                  />

                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    allowDecimals={false}
                  />

                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,.035)" }}
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(148,163,184,.2)",
                      borderRadius: 10,
                      boxShadow: "0 12px 30px rgba(15,23,42,.10)",
                      padding: "9px 12px",
                    }}
                    labelStyle={{
                      color: "#29313d",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                    itemStyle={{
                      color: "#5963d8",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <Bar
                    dataKey="value"
                    radius={[7, 7, 2, 2]}
                    fill={ACCENT}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="audit-modern-card">
              <h3>{t("audit.standard.analytics.complianceTrend")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.trend}>
                  <CartesianGrid
                    stroke="rgba(148,163,184,.13)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(148,163,184,.24)" }}
                    tickLine={false}
                    tickMargin={10}
                  />

                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    allowDecimals={false}
                  />

                  <Tooltip
                    cursor={{
                      stroke: "rgba(99,102,241,.18)",
                      strokeWidth: 1,
                    }}
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(148,163,184,.2)",
                      borderRadius: 10,
                      boxShadow: "0 12px 30px rgba(15,23,42,.10)",
                      padding: "9px 12px",
                    }}
                    labelStyle={{
                      color: "#29313d",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                    itemStyle={{
                      color: "#5963d8",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={ACCENT}
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: "#ffffff",
                      stroke: ACCENT,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: ACCENT,
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
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

export default StandardAuditAnalytics;
