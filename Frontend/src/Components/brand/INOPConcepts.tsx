export type LogoConcept = 'A' | 'B' | 'C';
export type LogoProps = { compact?: boolean; tone?: 'auto' | 'light' | 'dark'; concept?: LogoConcept };

/** Three original letterings; every variant contains only the letters INOP. */
export function INOPConcept({ concept = 'A', compact = false, tone = 'auto' }: LogoProps) {
  const ink = tone === 'light' ? '#EDF3FF' : tone === 'dark' ? '#132745' : 'currentColor';
  return <svg className="inop-logo" data-concept={concept} data-variant={compact ? 'compact' : 'wordmark'} role="img" aria-label="INOP" width={224} height={64} viewBox="0 0 224 64" xmlns="http://www.w3.org/2000/svg">
    <title>INOP</title>
    {concept === 'A' ? <g fill="none" stroke={ink} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(10 12)">
      <path data-letter="I" d="M4 0V40" />
      <path data-letter="N" d="M28 40V0L67 40V0" />
      <path data-letter="O" d="M108 0H116C127 0 133 6 133 17V23C133 34 127 40 116 40H108C97 40 91 34 91 23V17C91 6 97 0 108 0Z" />
      <path data-letter="P" d="M158 40V0H182C194 0 200 5 200 14S194 28 182 28H158" />
    </g> : concept === 'B' ? <g fill={ink} transform="translate(8 12)">
      <path data-letter="I" d="M0 0H9V40H0Z" />
      <path data-letter="N" d="M25 40V0H35L64 26V0H73V40H63L34 14V40Z" />
      <path data-letter="O" fillRule="evenodd" d="M107 0H121Q137 0 137 16V24Q137 40 121 40H107Q91 40 91 24V16Q91 0 107 0ZM109 9Q100 9 100 18V22Q100 31 109 31H119Q128 31 128 22V18Q128 9 119 9Z" />
      <path data-letter="P" fillRule="evenodd" d="M155 0H185Q207 0 207 15T185 30H164V40H155ZM164 9V21H184Q198 21 198 15T184 9Z" />
    </g> : <g fill="none" stroke={ink} strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" transform="translate(10 12)">
      <path data-letter="I" d="M0 0H16M8 0V40M0 40H16" />
      <path data-letter="N" d="M35 40V0L73 40V0" />
      <path data-letter="O" d="M107 0H128L138 10V30L128 40H107L97 30V10Z" />
      <path data-letter="P" d="M163 40V0H190L202 10V20L190 29H163" />
    </g>}
  </svg>;
}
