import { useState } from "react";
import api from "../api/axios";
export default function DeliveryStatus({
  id,
  canRetry,
}: {
  id: string;
  canRetry: boolean;
}) {
  const [items, setItems] = useState<
    { _id: string; status: string; lastError?: string }[] | null
  >(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      setItems((await api.get(`/applications/${id}/delivery`)).data);
    } catch {
      setError("Unable to load delivery status");
    }
  }
  return (
    <div>
      <button onClick={() => void load()}>Email status</button>
      {error && <span role="alert">{error}</span>}
      {items && (
        <div>
          {items.length ? (
            items.map((x) => (
              <p key={x._id}>
                {x.status}
                {x.lastError ? `: ${x.lastError}` : ""}
              </p>
            ))
          ) : (
            <p>No email required for this stage.</p>
          )}
          {canRetry &&
            items.some((x) => ["failed", "blocked"].includes(x.status)) && (
              <button
                onClick={() =>
                  void api
                    .post(`/applications/${id}/delivery/retry`)
                    .then(load)
                    .catch(() => setError("Retry failed"))
                }
              >
                Retry email
              </button>
            )}
        </div>
      )}
    </div>
  );
}
