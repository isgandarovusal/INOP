import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  children: ReactNode;
  titleId: string;
  descriptionId?: string;
  className?: string;
  busy?: boolean;
  onClose: () => void;
  focusCancel?: boolean;
};

/** Shared overlay: escapes page stacking contexts and retains keyboard focus. */
export default function Modal({ children, titleId, descriptionId, className = '', busy = false, onClose, focusCancel = false }: ModalProps) {
  const card = useRef<HTMLDivElement>(null);
  const latest = useRef({ busy, onClose });
  useLayoutEffect(() => { latest.current = { busy, onClose }; }, [busy, onClose]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(card.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]') || []).filter(el => el.getClientRects().length && !el.closest('[inert]'));
    (focusCancel ? card.current?.querySelector<HTMLElement>('.btn-cancel') : focusable()[0])?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !latest.current.busy) { event.preventDefault(); latest.current.onClose(); }
      if (event.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); card.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !card.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !card.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; if (before?.isConnected) before.focus(); };
  }, [focusCancel]);
  return createPortal(<div className="modal-backdrop" onClick={() => { if (!busy) onClose(); }}>
    <div ref={card} className={`modal-card ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy || undefined} tabIndex={-1} onClick={event => event.stopPropagation()}>{children}</div>
  </div>, document.body);
}
