import { useEffect, useId, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
export default function HRConfirmDialog({title,message,confirmLabel,loading=false,onConfirm,onCancel}: {title:string;message:string;confirmLabel?:string;loading?:boolean;onConfirm:()=>void;onCancel:()=>void}) {
  const {t}=useTranslation(),id=useId(),card=useRef<HTMLDivElement>(null),cancel=useRef<HTMLButtonElement>(null);
  const latest=useRef({loading,onCancel});useLayoutEffect(()=>{latest.current={loading,onCancel};},[loading,onCancel]);
  useEffect(()=>{
    const before=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';cancel.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!latest.current.loading){event.preventDefault();latest.current.onCancel();}
      if(event.key!=='Tab')return;
      const buttons=Array.from(card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);
      if(!buttons.length){event.preventDefault();card.current?.focus();return;}
      const first=buttons[0],last=buttons.at(-1)!;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(before?.isConnected)before.focus();};
  },[]);
  return <div className="modal-backdrop hr-dialog" onClick={()=>{if(!loading)onCancel();}}>
    <div ref={card} className="modal-card" role="dialog" aria-modal="true" aria-labelledby={id} aria-describedby={id+'-description'} aria-busy={loading} tabIndex={-1} onClick={e=>e.stopPropagation()}>
      <h3 id={id} className="modal-card__title">{title}</h3><p id={id+'-description'} className="modal-card__subtitle">{message}</p>
      <div className="modal-card__actions"><button className="btn-danger-solid" onClick={onConfirm} disabled={loading}>{loading&&<Loader2 size={16} className="spin"/>}{confirmLabel??t('components.confirmDialog.defaultConfirm')}</button><button ref={cancel} className="btn-cancel" onClick={onCancel} disabled={loading}>{t('components.confirmDialog.cancel')}</button></div>
    </div>
  </div>;
}
