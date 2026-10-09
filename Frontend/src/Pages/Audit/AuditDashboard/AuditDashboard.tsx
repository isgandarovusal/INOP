import { useAuditResource } from "../../../Hooks/useAuditResource";
import AuditResourceState from "../../../Components/AuditResourceState";


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
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

import {
  getAuditDashboard,
} from "../../../Services/auditDashboardService";
import { ACCENT } from "../../../Utils/theme";

export default function AuditDashboard() {
 const {data,status,reload}=useAuditResource("dashboard","dashboard",getAuditDashboard);
 if(status !== "ready" || !data) return <AuditResourceState status={status} retry={reload}/>;
  return (
    <div className="audit-dashboard">
      <div className="audit-dashboard__header">
        <div>
          <span className="audit-dashboard__eyebrow">
            AUDIT MANAGEMENT
          </span>
          <h1>Audit Dashboard</h1>
          <p>
            Operational overview of audit activity, risk and performance.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <ClipboardCheck />

          <span>
            Total Audits
          </span>

          <strong>
            {data.totalAudits}
          </strong>
        </div>

        <div className="kpi-card">
          <CheckCircle />

          <span>
            Completed
          </span>

          <strong>
            {data.completedAudits}
          </strong>
        </div>

        <div className="kpi-card">
          <TrendingUp />

          <span>
            Average Score
          </span>

          <strong>
            {data.scoredExecutions ? data.averageScore.toFixed(1) : "—"}
          </strong>
        </div>

        <div className="kpi-card">
          <AlertTriangle />

          <span>
            Risks
          </span>

          <strong>
            {data.riskStats?.reduce(
              (total, item) => total + item.count,
              0,
            )}
          </strong>
        </div>
      </div>

      <div className="charts-grid">
        <div className="audit-modern-card">
          <h3>
            Audit Types
          </h3>

          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart
              data={data.typeStats}
              margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
            >
              <CartesianGrid
                stroke="rgba(148, 163, 184, 0.13)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="_id"
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
                dataKey="count"
                fill={ACCENT}
                radius={[5, 5, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="audit-modern-card">
          <h3>
            Risk Distribution
          </h3>

          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <PieChart>
              <Pie
                data={data.riskStats}
                dataKey="count"
                nameKey="_id"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={3}
                stroke="none"
              >
                {data.riskStats?.map(
                  (_, index) => (
                    <Cell
                      key={index}
                      fill={
                        [
                          "#6366f1",
                          "#f59e0b",
                          "#ef4444",
                          "#64748b",
                          "#22c55e",
                        ][index % 5]
                      }
                    />
                  ),
                )}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="audit-modern-card">
        <h3>
          Audit Trend
        </h3>

        <ResponsiveContainer
          width="100%"
          height={280}
        >
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
              dataKey="count"
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
  );
}
