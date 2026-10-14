import type { LogoProps } from './brand/INOPConcepts';
import { wordmarkPaths } from './brand/wordmarkPaths';

/** One four-letter wordmark for login, sidebar, mobile topbar and drawer. */
export default function INOPLogo({ compact = false, tone = 'auto' }: Omit<LogoProps, 'concept'>) {
  const ink = tone === 'light' ? '#EDF3FF' : tone === 'dark' ? '#132745' : 'currentColor';
  return <svg className="inop-logo" data-variant={compact ? 'compact' : 'wordmark'} role="img" aria-label="INOP" width={224} height={64} viewBox="0 0 236 64" xmlns="http://www.w3.org/2000/svg">
    <title>INOP</title>
    <g fill={ink} fillRule="evenodd">{wordmarkPaths.map(([letter, path]) => <path key={letter} data-letter={letter} d={path} />)}</g>
  </svg>;
}
