import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "../../../Context/AuthContext";
import { ROLE_LABELS } from "../../../Utils/permissions";

const DEMO_ACCOUNTS = [
  { role: "admin" as const, email: "admin@inop.com", password: "password123" },
  { role: "hr" as const, email: "hr@inop.com", password: "password123" },
  { role: "auditor" as const, email: "auditor@inop.com", password: "password123" },
  { role: "manager" as const, email: "manager@inop.com", password: "password123" },
];

const Login: React.FC = () => {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? "/app/dashboard"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="auth-page">
      <div className="auth-page__grid-overlay" />
      <div className="auth-page__wrap">
        <div className="auth-page__brand anim-in">
          <Sparkles size={18} />
          INOP
        </div>
        <p className="auth-page__tagline anim-in" style={{ animationDelay: "0.04s" }}>
          Internal Operations Platform
        </p>

        <div className="auth-card anim-in" style={{ animationDelay: "0.08s" }}>
          <h1 className="auth-card__title">Sign in</h1>
          <p className="auth-card__subtitle">
            Use your INOP account to access recruitment and audit workflows.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@inop.com"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="form-error form-error--submit">
                <AlertCircle size={12} /> {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" /> Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} /> Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <div className="demo-card anim-in" style={{ animationDelay: "0.14s" }}>
          <p className="demo-card__title">Demo accounts</p>
          <p className="demo-card__hint">
            No backend yet — data lives in this browser. Pick a role to explore its view.
          </p>
          <div className="demo-card__list">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                type="button"
                key={acc.role}
                className="demo-account"
                onClick={() => fillDemo(acc.email, acc.password)}
              >
                <span className="demo-account__role">{ROLE_LABELS[acc.role]}</span>
                <span className="demo-account__email">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
