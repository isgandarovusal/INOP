import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from '../i18n';
import az from '../assets/flags/az.svg';
import en from '../assets/flags/gb.svg';
import ru from '../assets/flags/ru.svg';

const languages = [
  { code: 'az' as const, label: 'AZE', name: 'Azərbaycan', flag: az },
  { code: 'en' as const, label: 'ENG', name: 'English', flag: en },
  { code: 'ru' as const, label: 'RUS', name: 'Русский', flag: ru },
];
export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = i18n.language.split('-')[0];
  return <div className="language-switcher" role="group" aria-label={t('auth.language')}>
    {languages.map(language => <button key={language.code} type="button" title={language.name} aria-pressed={current === language.code} onClick={() => changeLanguage(language.code)}>
      <img src={language.flag} width={16} height={12} alt="" /><span>{language.label}</span>
    </button>)}
  </div>;
}
