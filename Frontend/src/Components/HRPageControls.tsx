import { useTranslation } from 'react-i18next';
import type { HRPage } from '../Services/hrPageService';
export default function HRPageControls({ data, page, onPage, disabled = false }: { data?: HRPage<unknown>; page: number; onPage: (page: number) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <nav className="hr-page-controls" aria-label={t('hrPage.pagination')} data-hr-pagination>
    <span role="status">{t('hrPage.summary', { page, total: data?.total ?? '—', shown: data?.items.length ?? 0 })}</span>
    <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>{t('common.actions.previous')}</button>
    <button type="button" disabled={disabled || !data?.hasMore} onClick={() => onPage(page + 1)}>{t('common.actions.next')}</button>
  </nav>;
}
