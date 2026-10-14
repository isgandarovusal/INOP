import React, { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../../../Context/useAuth";
import { useTranslation } from "react-i18next";
import INOPLogo from "../../../Components/INOPLogo";
import LanguageSwitcher from "../../../Components/LanguageSwitcher";
import "../../../Styles/auth.css";
import architecture from "../../../assets/brand/login-architecture.webp";

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
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const submitLock = useRef(false);

  if (!isLoading && user) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? "/app/dashboard"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || isLoading) return;
    const emailInput = e.currentTarget.querySelector<HTMLInputElement>('#email');
    const errors: { email?: string; password?: string } = {};
    if (!email.trim() || !emailInput?.validity.valid) errors.email = 'auth.emailInvalid';
    if (!password) errors.password = 'auth.passwordRequired';
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? 'email' : 'password')?.focus(); return;
    }
    submitLock.current = true;
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.somethingWentWrong"),
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <main className="auth-shell">
        <section className="auth-brand-panel" aria-label="INOP">
          <INOPLogo tone="dark" />
          <picture className="auth-brand-art" aria-hidden="true">
            <source media="(min-width: 681px)" srcSet={architecture} />
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E" width={1200} height={800} alt="" decoding="async" />
          </picture>
          <div className="auth-brand-copy">
            <h2>{t('auth.heroTitle')}</h2>
          </div>
        </section>
        <section className="auth-entry-panel">
          <LanguageSwitcher />
          <div className="auth-card">
            <h1 className="auth-card__title">{t("auth.signIn")}</h1>
            <p className="auth-card__subtitle">{t("auth.subtitle")}</p>
            <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  {t("auth.email")}
                </label>

                <input
                  id="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  type="email"
                  autoComplete="username"
                  placeholder={t("auth.emailPlaceholder")}
                  className="input-field"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(previous => ({ ...previous, email: undefined })); }}
                  required
                />
                {fieldErrors.email && <p className="form-error" id="email-error">{t(fieldErrors.email)}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  {t("auth.password")}
                </label>

                <div className="auth-password-field">
                  <input
                    id="password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-field auth-password-field__input"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(previous => ({ ...previous, password: undefined })); }}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-field__toggle" aria-pressed={showPassword}
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

              {fieldErrors.password && <p className="form-error" id="password-error">{t(fieldErrors.password)}</p>}

              {error && (
                <p role="alert" className="form-error form-error--submit">
                  <AlertCircle size={12} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || isLoading}
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
        </section>
      </main>
    </div>
  );
};

export default Login;
