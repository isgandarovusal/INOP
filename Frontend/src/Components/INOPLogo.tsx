import { useId } from 'react';

/** Folded N mark and restrained wordmark, shared by every application brand surface. */
export default function INOPLogo({ compact = false }: { compact?: boolean }) {
  const id = useId();
  return <svg className="inop-logo" data-variant={compact ? 'compact' : 'wordmark'} role="img" aria-label="INOP" width={224} height={64} viewBox="0 0 224 64" xmlns="http://www.w3.org/2000/svg">
    <title>INOP</title>
    <defs>
      <linearGradient id={`${id}-fold`} x1="5" y1="12" x2="22" y2="55" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4338ca"/><stop offset="1" stopColor="#8b6cff"/>
      </linearGradient>
      <linearGradient id={`${id}-diagonal`} x1="7" y1="9" x2="53" y2="55" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4b91ff"/><stop offset="1" stopColor="#347cff"/>
      </linearGradient>
    </defs>
    <path d="M5 14Q5 8 11 11L21 19V42L9 54Q5 58 5 52Z" fill={`url(#${id}-fold)`}/>
    <path d="M42 18L51 10Q57 6 57 13V29L47 39L42 34Z" fill="#4f3fe5"/>
    <path d="M6 10Q9 6 14 11L55 45Q60 50 55 55Q52 58 47 54L5 20V14Q5 12 6 10Z" fill={`url(#${id}-diagonal)`}/>
    <g fill="currentColor">
      <path d="M74 15H81V50H74Z"/>
      <path d="M89 15H96L116 39V15H123V50H116L96 26V50H89Z"/>
      <path fillRule="evenodd" d="M148 14C160 14 169 21 169 32.5S160 51 148 51S127 44 127 32.5S136 14 148 14ZM148 21C140 21 135 25 135 32.5S140 44 148 44S161 40 161 32.5S156 21 148 21Z"/>
      <path fillRule="evenodd" d="M177 15H199C211 15 219 20 219 30S211 45 199 45H185V50H177ZM185 22V38H199C207 38 211 35 211 30S207 22 199 22Z"/>
    </g>
  </svg>;
}
