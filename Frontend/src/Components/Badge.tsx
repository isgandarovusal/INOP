import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const Badge: React.FC<{ tone?: BadgeTone; children: ReactNode }> = ({
  tone = "neutral",
  children,
}) => {
  return <span className={`badge badge--${tone}`}>{children}</span>;
};

export default Badge;
