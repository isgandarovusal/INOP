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
  }, []);

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
    <div>
      <PageHeader
        title={t("audit.standard.analytics.title")}
        subtitle={t("audit.standard.analytics.subtitle")}
      />

      {loading && (
        <div className="empty-state">
          {t("audit.standard.analytics.loading")}
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
            <div className="chart-card">
              <h3>{t("audit.standard.analytics.findingsDistribution")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={findings}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>{t("audit.standard.analytics.complianceTrend")}</h3>

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

export default StandardAuditAnalytics;
