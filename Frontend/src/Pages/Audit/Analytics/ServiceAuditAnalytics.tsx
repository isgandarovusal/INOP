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
  Clock3,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import { getServiceAnalytics } from "../../../Services/auditAnalyticsService";
import type { ServiceAnalyticsData } from "../../../Services/auditAnalyticsService";

const ServiceAuditAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<ServiceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getServiceAnalytics()
      .then((response) => {
        setData(response.data);
      })
      .catch((err) => {
        console.error(err);
        setError(t("audit.service.analytics.error"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title={t("audit.service.analytics.title")}
        subtitle={t("audit.service.analytics.subtitle")}
      />

      {loading && (
        <div className="empty-state">
          {t("audit.service.analytics.loading")}
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
              <p>{t("audit.service.analytics.totalAudits")}</p>
              <h2>{data.total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />
              <p>{t("audit.service.analytics.averageScore")}</p>
              <h2>
                {data.averageOverallPercentage.toFixed(1)}%
              </h2>
            </div>

            <div className="kpi-card">
              <Clock3 size={22} />
              <p>{t("audit.service.analytics.averageServiceTime")}</p>
              <h2>
                {data.averageServiceTimeSeconds.toFixed(0)}{t("audit.service.analytics.secondsShort")}
              </h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>{t("audit.service.analytics.answers")}</h3>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.answerDistribution}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>{t("audit.service.analytics.trend")}</h3>

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

export default ServiceAuditAnalytics;
