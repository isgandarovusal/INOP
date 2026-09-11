import "../auditModern.css";
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
  Clock3,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import { getServiceAnalytics } from "../../../Services/auditAnalyticsService";
import type { ServiceAnalyticsData } from "../../../Services/auditAnalyticsService";

const ServiceAuditAnalytics: React.FC = () => {
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
        setError("Service analytics could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Service Audit Analytics"
        subtitle="MongoDB aggregation based service audit statistics"
      />

      {loading && (
        <div className="empty-state">
          Loading analytics...
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
              <p>Total service audits</p>
              <h2>{data.total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />
              <p>Average score</p>
              <h2>
                {data.averageOverallPercentage.toFixed(1)}%
              </h2>
            </div>

            <div className="kpi-card">
              <Clock3 size={22} />
              <p>Average service time</p>
              <h2>
                {data.averageServiceTimeSeconds.toFixed(0)}s
              </h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Service Answers</h3>

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
              <h3>Service Audit Trend</h3>

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
