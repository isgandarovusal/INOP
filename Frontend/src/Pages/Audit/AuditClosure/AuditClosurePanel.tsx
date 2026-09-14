import { useState } from "react";

import {
  closeAudit
} from "../../../Services/auditClosureService";


export default function AuditClosurePanel({
  auditId
}: {
  auditId: string;
}) {
  const [
    message,
    setMessage
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);


  async function close() {
    try {
      setLoading(true);
      setMessage("");

      await closeAudit({
        auditId,
        comment: "Audit completed"
      });

      setMessage(
        "Audit closed successfully"
      );

    } catch {
      setMessage(
        "Audit bağlanarkən xəta baş verdi."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="audit-modern-card">
      <h3>
        Audit Closure
      </h3>

      <button
        onClick={close}
        disabled={loading}
      >
        {loading
          ? "Closing..."
          : "Close Audit"}
      </button>

      {message && (
        <p>
          {message}
        </p>
      )}
    </div>
  );
}
