const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";


export async function closeAudit(
  payload: {
    auditId: string;
    executionId?: string;
    comment?: string;
  }
) {
  const res =
    await fetch(
      `${API}/audit-closure`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

  const data =
    await res.json();

  if (!res.ok) {
    throw new Error(
      data.message ||
      "Audit close failed"
    );
  }

  return data;
}


export async function getClosure(
  auditId: string
) {
  const res =
    await fetch(
      `${API}/audit-closure/${auditId}`
    );

  return res.json();
}
