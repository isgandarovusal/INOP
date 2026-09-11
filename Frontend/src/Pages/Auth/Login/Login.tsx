import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "../../../Context/AuthContext";
import { useTranslation } from "react-i18next";

const Login: React.FC = () => {
  const { t } = useTranslation();
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
      setError(
        err instanceof Error
          ? err.message
          : t("auth.somethingWentWrong"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__grid-overlay" />

      <div className="auth-page__wrap">
        <div className="auth-page__brand anim-in">
          <Sparkles size={18} />
          INOP
        </div>

        <p
          className="auth-page__tagline anim-in"
          style={{ animationDelay: "0.04s" }}
        >
          Internal Operations Platform
        </p>

        <div
          className="auth-card anim-in"
          style={{ animationDelay: "0.08s" }}
        >
          <h1 className="auth-card__title">{t("auth.signIn")}</h1>

          <p className="auth-card__subtitle">
            {t("auth.subtitle")}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t("auth.email")}
              </label>

              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder={t("auth.emailPlaceholder")}
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {t("auth.password")}
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

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t("auth.signingIn")}
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  {t("auth.signIn")}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
