import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../../../Context/useAuth";
import { useTranslation } from "react-i18next";
import i18n, { changeLanguage } from "../../../i18n";
import azFlag from "../../../assets/flags/az.svg";
import gbFlag from "../../../assets/flags/gb.svg";
import ruFlag from "../../../assets/flags/ru.svg";

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

  const languages = [
    { code: "az" as const, label: "AZE", flag: azFlag, name: "Azərbaycan" },
    { code: "en" as const, label: "ENG", flag: gbFlag, name: "English" },
    { code: "ru" as const, label: "RUS", flag: ruFlag, name: "Русский" },
  ];

  return (
    <div className="auth-page">
      <div className="auth-page__ambient auth-page__ambient--one" />
      <div className="auth-page__ambient auth-page__ambient--two" />
      <div className="auth-page__grid-overlay" />

      <main className="auth-shell">
        <section className="auth-brand-panel" aria-label="INOP">
          <div className="auth-brand-panel__top">
            <div className="auth-wordmark" aria-label="INOP">
              <span className="auth-wordmark__letter">I</span>
              <span className="auth-wordmark__letter">N</span>
              <span className="auth-wordmark__letter">O</span>
              <span className="auth-wordmark__letter">P</span>
            </div>

            <p className="auth-wordmark__descriptor">
              INTERNAL OPERATIONS PLATFORM
            </p>
          </div>

          <div className="auth-brand-panel__statement">
            <span className="auth-brand-panel__eyebrow">INOP / OPERATIONS</span>
            <h1>
              One platform.
              <br />
              <span>Every operation.</span>
            </h1>
            <p>{t("auth.subtitle")}</p>
          </div>

          <div className="auth-brand-panel__geometry" aria-hidden="true">
            <div className="auth-orbit auth-orbit--outer" />
            <div className="auth-orbit auth-orbit--middle" />
            <div className="auth-orbit auth-orbit--inner" />
            <div className="auth-orbit__core" />
            <span className="auth-orbit__point auth-orbit__point--one" />
            <span className="auth-orbit__point auth-orbit__point--two" />
          </div>

          <div className="auth-brand-panel__footer">
            <span>RECRUITMENT</span>
            <i />
            <span>AUDIT</span>
            <i />
            <span>OPERATIONS</span>
          </div>
        </section>

        <section className="auth-entry-panel">
          <div className="auth-entry-panel__topbar">
            <div className="auth-entry-panel__mobile-brand">
              <span>INOP</span>
              <small>INTERNAL OPERATIONS PLATFORM</small>
            </div>

            <div
              className="auth-language-switcher"
              aria-label={t("auth.language")}
            >
              {languages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className={`auth-language-switcher__option ${
                    i18n.language === language.code
                      ? "auth-language-switcher__option--active"
                      : ""
                  }`}
                  onClick={() => changeLanguage(language.code)}
                  aria-pressed={i18n.language === language.code}
                  aria-label={language.name}
                >
                  <img
                    src={language.flag}
                    alt=""
                    className="auth-language-switcher__flag"
                    aria-hidden="true"
                  />
                  <span>{language.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-card__eyebrow">WELCOME BACK</div>

            <h2 className="auth-card__title">{t("auth.signIn")}</h2>

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
                <p className="form-error form-error--submit">
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

            <div className="auth-card__security">
              <span className="auth-card__security-dot" />
              Secure internal workspace
            </div>
          </div>

          <p className="auth-entry-panel__footer">
            INOP · INTERNAL OPERATIONS PLATFORM
          </p>
        </section>
      </main>
    </div>
  );
};

export default Login;
