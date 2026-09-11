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
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import { getSafetyAnalytics } from "../../../Services/auditAnalyticsService";
import type { SafetyAnalyticsData } from "../../../Services/auditAnalyticsService";

const SafetyAuditAnalytics: React.FC = () => {
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
        setError("Safety analytics could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Occupational Safety Analytics"
        subtitle="MongoDB aggregation based safety audit statistics"
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
              <p>Total safety audits</p>
              <h2>{data.total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />
              <p>Average score</p>
              <h2>
                {data.averageScorePercentage.toFixed(1)}%
              </h2>
            </div>

            <div className="kpi-card">
              <CheckCircle2 size={22} />
              <p>Answered checks</p>
              <h2>
                {data.answered}/{data.totalChecks}
              </h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Safety Score Distribution</h3>

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
              <h3>Safety Audit Trend</h3>

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
