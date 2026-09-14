import {
  useEffect,
  useState,
} from "react";

import {
  getAssignments,
  type AuditAssignment,
} from "../../../Services/auditAssignmentService";

interface AuditAssignmentsListProps {
  auditId: string;
}

export default function AuditAssignmentsList({
  auditId,
}: AuditAssignmentsListProps) {
  const [data, setData] = useState<AuditAssignment[]>([]);

  useEffect(() => {
    getAssignments(auditId).then((response) => {
      setData(response.data || []);
    });
  }, [auditId]);

  return (
    <div>
      <h2>Audit Assignments</h2>

      {data.map((assignment) => (
        <div
          className="audit-card"
          key={assignment._id}
        >
          Auditor:
          {assignment.auditor?.name || "Unknown"}

          <br />

          Status:
          {assignment.status}
        </div>
      ))}
    </div>
  );
}
