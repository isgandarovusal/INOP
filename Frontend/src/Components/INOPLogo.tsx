import small from '../assets/brand/inop-320.webp';
import large from '../assets/brand/inop-640.webp';

export default function INOPLogo() {
  return <img className="inop-logo" src={small} srcSet={`${small} 320w, ${large} 640w`} sizes="(max-width: 560px) 192px, 320px" width={320} height={128} alt="INOP — Internal Operations Platform" decoding="async" />;
}
