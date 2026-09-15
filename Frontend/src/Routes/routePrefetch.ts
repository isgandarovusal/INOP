const loaders: Record<string, () => Promise<unknown>> = {
  "/app/dashboard": () =>
    import("../Pages/Dashboard/Dashboard"),

  "/app/recruitment/jobs": () =>
    import("../Pages/Recruitment/Jobs/JobsList"),

  "/app/recruitment/candidates": () =>
    import("../Pages/Recruitment/Candidates/CandidatesList"),

  "/app/recruitment/applications": () =>
    import("../Pages/Recruitment/Applications/ApplicationsList"),

  "/app/audit/restaurants": () =>
    import("../Pages/Audit/Restaurants/RestaurantsList"),

  "/app/audit/audits": () =>
    import("../Pages/Audit/Audits/AuditsList"),

  "/app/audit/analytics": () =>
    import("../Pages/Audit/Analytics/AuditAnalytics"),

  "/app/audit/checklists": () =>
    import("../Pages/Audit/ChecklistBuilder/AuditTemplatesList"),

  "/app/audit/service": () =>
    import("../Pages/Audit/ServiceAudit/ServiceAuditsList"),

  "/app/audit/service/analytics": () =>
    import("../Pages/Audit/Analytics/ServiceAuditAnalytics"),

  "/app/audit/standard": () =>
    import("../Pages/Audit/StandardAudit/StandardAuditsList"),

  "/app/audit/standard/analytics": () =>
    import("../Pages/Audit/Analytics/StandardAuditAnalytics"),

  "/app/audit/safety": () =>
    import("../Pages/Audit/OccupationalSafetyAudit/SafetyAuditsList"),

  "/app/audit/safety/analytics": () =>
    import("../Pages/Audit/Analytics/SafetyAuditAnalytics"),

  "/app/users": () =>
    import("../Pages/Users/UsersList"),

  "/app/departments": () =>
    import("../Pages/Departments/DepartmentsList"),

  "/app/roles": () =>
    import("../Pages/Roles/RolesOverview"),

  "/app/activity-log": () =>
    import("../Pages/ActivityLog/ActivityLogList"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) {
    return;
  }

  const loader = loaders[path];

  if (!loader) {
    return;
  }

  prefetched.add(path);

  void loader().catch(() => {
    prefetched.delete(path);
  });
}

export default prefetchRoute;
