import React from "react";
import {ResponsiveContainer, PieChart, Pie, Cell} from "recharts";
import type {CandidateSummary} from "../../Services/dashboardSummaryService";
import type {CandidateStatus} from "../../Types/recruitment";

const STATUS_COLORS: Partial<Record<CandidateStatus, string>> = {
  applied: "#0ea5e9",
  interview: "#8b5cf6",
  offer: "#14b8a6",

  new: "#0ea5e9",
  screening: "#d97706",
  shortlisted: "#6366f1",
  rejected: "#ef4444",
  hired: "#16a34a",
};

export default React.memo(function CandidateStatusDonut({ data }: { data: CandidateSummary["statusBreakdown"] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={55}
          outerRadius={75}
          paddingAngle={2}
          animationDuration={900}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status as CandidateStatus]}
              stroke="none"
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
});

