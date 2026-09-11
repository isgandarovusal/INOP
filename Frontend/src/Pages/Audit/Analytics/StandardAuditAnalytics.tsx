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
  CircleCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../Components/PageHeader";

import { getStandardAnalytics } from "../../../Services/auditAnalyticsService";
import type { StandardAnalyticsData } from "../../../Services/auditAnalyticsService";

const StandardAuditAnalytics: React.FC = () => {
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
        setError("Standard analytics could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const findings = data
    ? [
        {
          name: "Critical",
          value: data.findings.critical,
        },
        {
          name: "Major",
          value: data.findings.major,
        },
        {
          name: "Minor",
          value: data.findings.minor,
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Standard Audit Analytics"
        subtitle="MongoDB aggregation based standard audit statistics"
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
              <p>Total standard audits</p>
              <h2>{data.total}</h2>
            </div>

            <div className="kpi-card">
              <TrendingUp size={22} />
              <p>Average compliance</p>
              <h2>
                {data.averageCompliancePercentage.toFixed(1)}%
              </h2>
            </div>

            <div className="kpi-card">
              <CircleCheck size={22} />
              <p>Passed audits</p>
              <h2>{data.passed}</h2>
            </div>

            <div className="kpi-card">
              <AlertTriangle size={22} />
              <p>Failed audits</p>
              <h2>{data.failed}</h2>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Findings Distribution</h3>

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
              <h3>Compliance Trend</h3>

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
