import type { ReactNode } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export default function HRFilterPanel({ children, activeCount = 0, onOpenChange }: {
  children: ReactNode; activeCount?: number; onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return <details className="hr-filter-panel" data-hr-filters onToggle={event => onOpenChange?.(event.currentTarget.open)}>
    <summary><SlidersHorizontal size={15} aria-hidden="true"/><span>{t('hrWorkspace.filters')}</span>
      {activeCount > 0 && <span className="hr-filter-count">{t('hrWorkspace.activeFilters', { count: activeCount })}</span>}
      <ChevronDown size={14} aria-hidden="true" className="hr-filter-chevron"/></summary>
    <div className="hr-filter-panel__body">{children}</div>
  </details>;
}
