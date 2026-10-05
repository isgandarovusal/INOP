import "../auditModern.css";
import "../auditAnalytics.css";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import {
  getAuditSummary,
  getAuditTypeAnalytics,
  getAuditTrend,
  type SummaryData,
  type TypeAnalyticsData,
  type TrendData,
} from "../../../Services/auditAnalyticsService";
import { ACCENT } from "../../../Utils/theme";

const AuditAnalytics: React.FC = () => {
  const { t } = useTranslation();

  const [statusData, setStatusData] = useState<
    SummaryData["statusSummary"]
  >([]);

  const [typeData, setTypeData] = useState<
    TypeAnalyticsData["typeSummary"]
  >([]);

  const [trendData, setTrendData] = useState<
    TrendData["trend"]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAuditSummary(),
      getAuditTypeAnalytics(),
      getAuditTrend(),
    ])
      .then(([summary, type, trend]) => {
        setStatusData(summary?.data?.statusSummary || []);

        setTypeData(type?.data?.typeSummary || []);

        setTrendData(trend?.data?.trend || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = statusData.reduce(
    (sum: number, item: SummaryData["statusSummary"][number]) =>
      sum + item.value,
    0,
  );

  return (
    <div className="audit-analytics">
      <PageHeader
        title={t("audit.analytics.title")}
        subtitle={t("audit.analytics.subtitle")}
      />

      {loading ? (
        <div className="audit-modern-empty">
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <BarChart3 size={22} />

              <p>
                {t("audit.analytics.totalAudits")}
              </p>

              <h2>{total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />

              <p>
                {t("audit.analytics.statusGroups")}
              </p>

              <h2>{statusData.length}</h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="audit-modern-card">
              <h3>{t("audit.analytics.auditStatus")}</h3>

              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <BarChart data={statusData}>
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
              <h3>{t("audit.analytics.auditTypes")}</h3>

              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <BarChart data={typeData}>
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
                    cursor={{ fill: "rgba(14,165,233,.035)" }}
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
                      color: "#1687b8",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <Bar
                    dataKey="value"
                    radius={[7, 7, 2, 2]}
                    fill="#0ea5e9"
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="audit-modern-card">
            <h3>{t("audit.analytics.auditTrend")}</h3>

            <ResponsiveContainer
              width="100%"
              height={280}
            >
              <LineChart data={trendData}>
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
                  width={34}
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
        </>
      )}
    </div>
  );
};

export default AuditAnalytics;
