import { Link, useParams } from "react-router-dom";
export default function WorkflowLink() {
  const { id } = useParams();
  return (
    <p>
      <Link className="btn-primary" to={`/app/audit/workflow/${id}`}>
        Open audit workflow
      </Link>
    </p>
  );
}
