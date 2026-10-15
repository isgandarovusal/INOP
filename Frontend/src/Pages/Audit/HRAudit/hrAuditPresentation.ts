import editorial from '../../../i18n/hrAuditEditorial.json';
type Entry={az:string;en:string;ru:string;source:string;guidance?:{az:string;en:string;ru:string};optionalRole?:boolean;clarification?:string};
const entries:Record<string,Entry>=editorial.entries;
export const hrEditorialVersion=editorial.version;
export function hrText(id:string,fallback:string,language:string,guidance=false){const entry=entries[id];const locale=language.split('-')[0];const lang=locale==='en'||locale==='ru'?locale:'az';return (guidance?entry?.guidance?.[lang]:entry?.[lang])??fallback;}
export const hrOptionalRole=(id:string)=>entries[id]?.optionalRole===true;
export const hrNeedsClarification=(id:string)=>Boolean(entries[id]?.clarification);
