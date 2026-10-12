import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../../../Context/useAuth";
import { useTranslation } from "react-i18next";
import INOPLogo from "../../../Components/INOPLogo";
import LanguageSwitcher from "../../../Components/LanguageSwitcher";
import "../../../Styles/auth.css";

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <main className="auth-shell">
        <section className="auth-brand-panel" aria-label="INOP">
          <INOPLogo />
          <div className="auth-brand-panel__footer">RECRUITMENT · AUDIT · OPERATIONS</div>
        </section>
        <section className="auth-entry-panel">
          <LanguageSwitcher />
          <div className="auth-card">
            <h1 className="auth-card__title">{t("auth.signIn")}</h1>
            <p className="auth-card__subtitle">{t("auth.subtitle")}</p>
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

                <div className="auth-password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-field auth-password-field__input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-field__toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                    title={
                      showPassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="form-error form-error--submit">
                  <AlertCircle size={12} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary auth-submit"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    {t("auth.signingIn")}
                  </>
                ) : (
                  <>
                    <span className="auth-submit__content">
                      <span>{t("auth.signIn")}</span>
                      <ArrowRight
                        size={17}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
          <p className="auth-entry-panel__footer">INOP · INTERNAL OPERATIONS PLATFORM</p>
        </section>
      </main>
    </div>
  );
};

export default Login;
