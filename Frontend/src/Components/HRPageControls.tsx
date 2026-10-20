import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import type { HRPage } from '../Services/hrPageService';
export default function HRPageControls({ data, page, onPage, disabled = false, onRefresh, refreshing = false }: { data?: HRPage<unknown>; page: number; onPage: (page: number) => void; disabled?: boolean; onRefresh?: () => void; refreshing?: boolean }) {
  const { t } = useTranslation();
  return <nav className="hr-page-controls" aria-label={t('hrPage.pagination')} data-hr-pagination>
    <span role="status">{t('hrPage.summary', { page, total: data?.total ?? '—', shown: data?.items.length ?? 0 })}</span>
    {onRefresh && <button className="btn-secondary" type="button" aria-label={t('common.actions.refresh')} aria-busy={refreshing || undefined} disabled={disabled || refreshing} onClick={onRefresh}><RefreshCw size={16} className={refreshing ? 'spin' : undefined} aria-hidden="true" />{t('common.actions.refresh')}</button>}
    <button className="btn-secondary" type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>{t('common.actions.previous')}</button>
    <button className="btn-secondary" type="button" disabled={disabled || !data?.hasMore} onClick={() => onPage(page + 1)}>{t('common.actions.next')}</button>
  </nav>;
}
