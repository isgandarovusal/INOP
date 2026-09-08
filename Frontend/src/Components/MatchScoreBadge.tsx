import React from "react";
import { Sparkles } from "lucide-react";

interface MatchScoreBadgeProps {
  score: number;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({ score }) => {
  let color = "#ef4444"; // Aşağı uyğunluq (Qırmızı)
  let bgColor = "#fef2f2";

  if (score >= 75) {
    color = "#10b981"; // Yüksək uyğunluq (Yaşıl)
    bgColor = "#ecfdf5";
  } else if (score >= 50) {
    color = "#f59e0b"; // Orta uyğunluq (Sarı)
    bgColor = "#fffbeb";
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "12px",
        backgroundColor: bgColor,
        color: color,
        fontWeight: 600,
        fontSize: "12px",
        border: `1px solid ${color}33`,
      }}
    >
      <Sparkles size={13} />
      <span>AI Match: {score}%</span>
    </div>
  );
};

export default MatchScoreBadge;