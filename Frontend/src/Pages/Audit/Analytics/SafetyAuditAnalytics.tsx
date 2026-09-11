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
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import { getSafetyAnalytics } from "../../../Services/auditAnalyticsService";
import type { SafetyAnalyticsData } from "../../../Services/auditAnalyticsService";

const SafetyAuditAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] =
    useState<SafetyAnalyticsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSafetyAnalytics()
      .then((response) => {
        setData(response.data);
      })
      .catch((err) => {
        console.error(err);
        setError(t("audit.safety.analytics.error"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title={t("audit.safety.analytics.title")}
        subtitle={t("audit.safety.analytics.subtitle")}
      />

      {loading && (
        <div className="empty-state">
          {t("audit.safety.analytics.loading")}
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
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
                {data.averageScorePercentage.toFixed(1)}%
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
            <div className="chart-card">
              <h3>{t("audit.safety.analytics.scoreDistribution")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.distribution}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>{t("audit.safety.analytics.trend")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
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
