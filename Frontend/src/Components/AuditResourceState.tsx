import ResourceState from "./ResourceState";
import type { AuditLoadStatus } from "../Hooks/useAuditResource";

export default function AuditResourceState(props: { status: AuditLoadStatus; retry?: () => void }) {
  return <ResourceState {...props} kind="audit" />;
}
