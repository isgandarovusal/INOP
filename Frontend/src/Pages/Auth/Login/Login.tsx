import React, { useRef, useState } from "react";
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
          <INOPLogo tone="light" />
          <svg className="auth-brand-art" viewBox="0 0 520 320" aria-hidden="true" focusable="false">
            <path className="auth-brand-art__plane" d="M70 320V170L230 75L450 195V320Z" />
            <path className="auth-brand-art__edge" d="M70 320V170L230 75L450 195V320M70 170L285 290L450 195M230 75V225" />
            <path className="auth-brand-art__depth" d="M0 270L160 175L380 295M0 305L160 210L360 320M230 110L415 211M230 145L380 231" />
            <path className="auth-brand-art__gateway" d="M186 239V163L230 137L292 171V249L272 261V186L230 163L206 177V250Z" />
          </svg>
          <div className="auth-brand-copy">
            <h2>{t('auth.heroTitle')}</h2>
            <p>{t('auth.heroSubtitle')}</p>
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
