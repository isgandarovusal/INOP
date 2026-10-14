export type LogoConcept = 'A' | 'B' | 'C';
export type LogoProps = { compact?: boolean; iconOnly?: boolean; tone?: 'auto' | 'light' | 'dark'; concept?: LogoConcept };

/** Flat, font-independent artwork keeps every brand surface consistent. */
export function INOPConcept({ concept = 'B', compact = false, iconOnly = false, tone = 'auto' }: LogoProps) {
  const ink = tone === 'light' ? '#EDF3FF' : tone === 'dark' ? '#132745' : 'currentColor';
  const accent = tone === 'light' ? '#A5B4FC' : '#4338CA';
  return <svg className="inop-logo" data-concept={concept} data-variant={iconOnly ? 'icon' : compact ? 'compact' : 'wordmark'} role="img" aria-label="INOP" width={iconOnly ? 64 : 224} height={64} viewBox={iconOnly ? '0 0 64 64' : '0 0 224 64'} xmlns="http://www.w3.org/2000/svg">
    <title>INOP</title>
    {concept === 'A' ? <g fill={ink}>
      {iconOnly ? <path d="M18 10H46V17H36V47H46V54H18V47H28V17H18Z"/> : <g transform="translate(10 4) scale(1.3 1.15)"><Wordmark /></g>}
    </g> : <>
      {concept === 'B' ? <g>
        <path d="M9 14H17V50H9Z" fill={accent}/>
        <path d="M27 10H43C52 10 57 16 57 25V39C57 48 52 54 43 54H27V46H42C47 46 49 43 49 38V26C49 21 47 18 42 18H27Z" fill={ink}/>
        <path d="M21 28H34V36H21Z" fill={accent}/>
      </g> : <g>
        <path d="M8 12H44V20H16V44H44V52H8Z" fill={ink}/>
        <path d="M24 27H56V35H24Z" fill={accent}/>
        <path d="M48 12H56V20H48ZM48 44H56V52H48Z" fill={ink}/>
      </g>}
      {!iconOnly && <g fill={ink} transform={concept === 'C' ? 'translate(72 4) skewX(-4)' : 'translate(72 4)'}><Wordmark /></g>}
    </>}
  </svg>;
}
function Wordmark() {
  return <>
    <path d="M0 12H7V44H0ZM16 12H23L42 33V12H49V44H42L23 23V44H16Z"/>
    <path fillRule="evenodd" d="M75 11C87 11 95 18 95 28S87 45 75 45S55 38 55 28S63 11 75 11ZM75 18C67 18 63 22 63 28S67 38 75 38S87 34 87 28S83 18 75 18Z"/>
    <path fillRule="evenodd" d="M103 12H123C134 12 140 17 140 25S134 38 123 38H111V44H103ZM111 19V31H122C129 31 132 29 132 25S129 19 122 19Z"/>
  </>;
}
