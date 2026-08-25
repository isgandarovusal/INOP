import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  ImageIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ArrowUpRight,
  PackageOpen,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import MainContext from "../../../Context/Context";
// Styles for this page live in App.css, scoped under .dashboard-page
// (see the CSS block provided alongside this file).

interface Product {
  _id: string;
  title: string;
  description: string;
  images?: string[];
  createdAt?: string;
}

/* ── Animated count-up for KPI numbers ───────────────────────── */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let frame: number;
    const animate = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const relativeTime = (dateStr?: string): string => {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Dashboard: React.FC = () => {
  const { products } = useContext(MainContext) as { products: Product[] };
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000";

  const stats = useMemo(() => {
    const total = products.length;
    const withImages = products.filter(
      (p) => p.images && p.images.length > 0,
    ).length;
    const withoutImages = total - withImages;
    const imagesPct = total ? Math.round((withImages / total) * 100) : 0;

    const hasDates = products.some((p) => p.createdAt);

    // 14-day trend
    const days: { label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const count = hasDates
        ? products.filter((p) => {
            if (!p.createdAt) return false;
            const pd = new Date(p.createdAt);
            return (
              pd.getFullYear() === d.getFullYear() &&
              pd.getMonth() === d.getMonth() &&
              pd.getDate() === d.getDate()
            );
          }).length
        : 0;
      days.push({ label, count });
    }

    // week-over-week growth
    let growthPct: number | null = null;
    if (hasDates) {
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const thisWeek = products.filter(
        (p) => p.createdAt && now - new Date(p.createdAt).getTime() <= oneWeek,
      ).length;
      const lastWeek = products.filter((p) => {
        if (!p.createdAt) return false;
        const age = now - new Date(p.createdAt).getTime();
        return age > oneWeek && age <= oneWeek * 2;
      }).length;
      if (lastWeek > 0) {
        growthPct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      } else if (thisWeek > 0) {
        growthPct = 100;
      } else {
        growthPct = 0;
      }
    }

    const recent = [...products]
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 5);

    return {
      total,
      withImages,
      withoutImages,
      imagesPct,
      days,
      hasDates,
      growthPct,
      recent,
    };
  }, [products]);

  const totalCount = useCountUp(stats.total);
  const imagesCount = useCountUp(stats.withImages);
  const imagesPctCount = useCountUp(stats.imagesPct);

  const kpis = [
    {
      label: "Total products",
      value: totalCount,
      icon: Package,
      accent: "#6366f1",
      accentBg: "rgba(99,102,241,0.12)",
    },
    {
      label: "With images",
      value: imagesCount,
      suffix: ` / ${stats.total}`,
      icon: ImageIcon,
      accent: "#22c55e",
      accentBg: "rgba(34,197,94,0.12)",
    },
    {
      label: "Missing images",
      value: stats.withoutImages,
      icon: PackageOpen,
      accent: "#f59e0b",
      accentBg: "rgba(245,158,11,0.12)",
    },
  ];

  const pieData = [
    { name: "With images", value: stats.withImages },
    { name: "Missing images", value: stats.withoutImages || 0 },
  ];
  const pieColors = ["#6366f1", "#e5e7f0"];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header anim-in">
        <div>
          <h2 className="dashboard-page__title">Dashboard</h2>
          <p className="dashboard-page__subtitle">
            A quick look at your catalog's health.
          </p>
        </div>
        <button className="btn-add" onClick={() => navigate("/admin/add")}>
          Add product
        </button>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="kpi-card anim-in"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div
                className="kpi-card__icon"
                style={{ background: kpi.accentBg }}
              >
                <Icon size={18} color={kpi.accent} />
              </div>
              <p className="kpi-card__label">{kpi.label}</p>
              <p className="kpi-card__value">
                {kpi.value}
                {kpi.suffix && (
                  <span className="kpi-card__suffix">{kpi.suffix}</span>
                )}
              </p>
            </div>
          );
        })}

        <div className="kpi-card anim-in" style={{ animationDelay: "0.18s" }}>
          <div
            className="kpi-card__icon"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >
            {stats.growthPct === null ? (
              <Minus size={18} color="#6366f1" />
            ) : stats.growthPct >= 0 ? (
              <TrendingUp size={18} color="#22c55e" />
            ) : (
              <TrendingDown size={18} color="#ef4444" />
            )}
          </div>
          <p className="kpi-card__label">Weekly growth</p>
          <p className="kpi-card__value">
            {stats.growthPct === null ? (
              <span className="kpi-card__na">No date data</span>
            ) : (
              <span
                style={{
                  color:
                    stats.growthPct > 0
                      ? "#16a34a"
                      : stats.growthPct < 0
                        ? "#dc2626"
                        : "inherit",
                }}
              >
                {stats.growthPct > 0 ? "+" : ""}
                {stats.growthPct}%
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-grid">
        <div className="chart-card anim-in" style={{ animationDelay: "0.1s" }}>
          <div className="chart-card__header">
            <h3>Products added</h3>
            <span className="chart-card__hint">Last 14 days</span>
          </div>
          {stats.hasDates ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={stats.days}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#8b90a8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid rgba(26,29,46,0.08)",
                    fontSize: 12,
                    boxShadow: "0 8px 24px -8px rgba(30,34,60,0.2)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#dashGradient)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">
              <Clock size={22} />
              <p>
                No date data on products yet — this fills in automatically once
                your API returns createdAt.
              </p>
            </div>
          )}
        </div>

        <div
          className="chart-card chart-card--donut anim-in"
          style={{ animationDelay: "0.16s" }}
        >
          <div className="chart-card__header">
            <h3>Image coverage</h3>
            <span className="chart-card__hint">All products</span>
          </div>
          {stats.total > 0 ? (
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={78}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    animationDuration={900}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="donut-center__value">{imagesPctCount}%</span>
                <span className="donut-center__label">have images</span>
              </div>
            </div>
          ) : (
            <div className="chart-empty">
              <ImageIcon size={22} />
              <p>Add products to see image coverage here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent products */}
      <div className="recent-card anim-in" style={{ animationDelay: "0.22s" }}>
        <div className="chart-card__header">
          <h3>Recent products</h3>
          <button
            className="recent-card__link"
            onClick={() => navigate("/admin/products")}
          >
            View all <ArrowUpRight size={13} />
          </button>
        </div>

        {stats.recent.length === 0 ? (
          <div className="chart-empty">
            <PackageOpen size={22} />
            <p>No products yet — add your first one to see it here.</p>
          </div>
        ) : (
          <div className="recent-list">
            {stats.recent.map((item, idx) => (
              <div
                key={item._id}
                className="recent-row"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {item.images && item.images.length > 0 ? (
                  <img
                    src={`${API_URL}/${item.images[0].replace(/\\/g, "/")}`}
                    alt={item.title}
                    className="recent-row__img"
                  />
                ) : (
                  <div className="recent-row__img recent-row__img--empty">
                    <ImageIcon size={14} />
                  </div>
                )}
                <div className="recent-row__info">
                  <p className="recent-row__title">{item.title}</p>
                  <p className="recent-row__desc">{item.description}</p>
                </div>
                {item.createdAt && (
                  <span className="recent-row__time">
                    {relativeTime(item.createdAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
