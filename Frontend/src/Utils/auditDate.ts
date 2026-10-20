/** Calendar date in the user's browser timezone, without converting it to UTC. */
export function localAuditDate() {
 const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
