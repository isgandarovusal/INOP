import authenticatedFetch from "../api/authenticatedFetch";
const API = import.meta.env.VITE_API_BASE_URL || "/api";

export async function checkAuditAccess() {
  const res = await authenticatedFetch(`${API}/audit-permission/check`);

  return res.json();
}
