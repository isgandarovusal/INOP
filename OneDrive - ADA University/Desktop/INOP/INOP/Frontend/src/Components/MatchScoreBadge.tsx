import React from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MatchScoreBadgeProps {
  score: number;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({ score }) => {
  const { t } = useTranslation();

  let color = "#ef4444";
  let bgColor = "#fef2f2";

  if (score >= 75) {
    color = "#10b981";
    bgColor = "#ecfdf5";
  } else if (score >= 50) {
    color = "#f59e0b";
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
        color,
        fontWeight: 600,
        fontSize: "12px",
        border: `1px solid ${color}33`,
      }}
    >
      <Sparkles size={13} />
      <span>
        {t("components.matchScore.label")}: {score}%
      </span>
    </div>
  );
};

export default MatchScoreBadge;
