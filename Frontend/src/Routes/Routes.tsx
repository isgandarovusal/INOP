import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import AppShell from "../Layouts/AppShell/AppShell";
const Login = lazy(() => import("../Pages/Auth/Login/Login"));
const Dashboard = lazy(() => import("../Pages/Dashboard/Dashboard"));
const JobsList = lazy(() => import("../Pages/Recruitment/Jobs/JobsList"));
const JobForm = lazy(() => import("../Pages/Recruitment/Jobs/JobForm"));
const JobDetail = lazy(() => import("../Pages/Recruitment/Jobs/JobDetail"));
const CandidatesList = lazy(() => import("../Pages/Recruitment/Candidates/CandidatesList"));
const CandidateForm = lazy(() => import("../Pages/Recruitment/Candidates/CandidateForm"));
const CandidateDetail = lazy(() => import("../Pages/Recruitment/Candidates/CandidateDetail"));
const ApplicationsList = lazy(() => import("../Pages/Recruitment/Applications/ApplicationsList"));
const RestaurantsList = lazy(() => import("../Pages/Audit/Restaurants/RestaurantsList"));
const RestaurantForm = lazy(() => import("../Pages/Audit/Restaurants/RestaurantForm"));
const RestaurantDetail = lazy(() => import("../Pages/Audit/Restaurants/RestaurantDetail"));
const AuditsList = lazy(() => import("../Pages/Audit/Audits/AuditsList"));
const AuditForm = lazy(() => import("../Pages/Audit/Audits/AuditForm"));
const AuditDetail = lazy(() => import("../Pages/Audit/Audits/AuditDetail"));
const AuditEdit = lazy(() => import("../Pages/Audit/Audits/AuditEdit"));
const AuditAnalytics = lazy(() => import("../Pages/Audit/Analytics/AuditAnalytics"));
const AuditDashboard = lazy(() => import("../Pages/Audit/AuditDashboard/AuditDashboard"));
const AuditNotificationsList = lazy(() => import("../Pages/Audit/AuditNotifications/AuditNotificationsList"));
const AuditHome = lazy(() => import("../Pages/Audit/AuditHome/AuditHome"));
const AuditReportDetail = lazy(() => import("../Pages/Audit/AuditReport/AuditReportDetail"));
const AuditExecutionPage = lazy(() => import("../Pages/Audit/AuditExecution/AuditExecutionPage"));
const SafetyAuditAnalytics = lazy(() => import("../Pages/Audit/Analytics/SafetyAuditAnalytics"));
const ServiceAuditAnalytics = lazy(() => import("../Pages/Audit/Analytics/ServiceAuditAnalytics"));
const StandardAuditAnalytics = lazy(() => import("../Pages/Audit/Analytics/StandardAuditAnalytics"));
const AuditTemplatesList = lazy(() => import("../Pages/Audit/ChecklistBuilder/AuditTemplatesList"));
const AuditTemplateBuilder = lazy(() => import("../Pages/Audit/ChecklistBuilder/AuditTemplateBuilder"));
const ServiceAuditsList = lazy(() => import("../Pages/Audit/ServiceAudit/ServiceAuditsList"));
const ServiceAuditForm = lazy(() => import("../Pages/Audit/ServiceAudit/ServiceAuditForm"));
const StandardAuditsList = lazy(() => import("../Pages/Audit/StandardAudit/StandardAuditsList"));
const StandardAuditForm = lazy(() => import("../Pages/Audit/StandardAudit/StandardAuditForm"));
const StandardAuditDetail = lazy(() => import("../Pages/Audit/StandardAudit/StandardAuditDetail"));
const SafetyAuditsList = lazy(() => import("../Pages/Audit/OccupationalSafetyAudit/SafetyAuditsList"));
const SafetyAuditForm = lazy(() => import("../Pages/Audit/OccupationalSafetyAudit/SafetyAuditForm"));
const SafetyAuditDetail = lazy(() => import("../Pages/Audit/OccupationalSafetyAudit/SafetyAuditDetail"));
const UsersList = lazy(() => import("../Pages/Users/UsersList"));
const UserForm = lazy(() => import("../Pages/Users/UserForm"));
const DepartmentsList = lazy(() => import("../Pages/Departments/DepartmentsList"));
const RolesOverview = lazy(() => import("../Pages/Roles/RolesOverview"));
const ActivityLogList = lazy(() => import("../Pages/ActivityLog/ActivityLogList"));
const NotFound = lazy(() => import("../Pages/NotFound/NotFound"));
const Unauthorized = lazy(() => import("../Pages/Unauthorized/Unauthorized"));

const ROUTES: RouteObject[] = [
  { path: "/", element: <Navigate to="/app/dashboard" replace /> },
  { path: "/login", element: <Login /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          {
            element: <RoleRoute section="recruitment" />,
            children: [
              { path: "recruitment/jobs", element: <JobsList /> },
              { path: "recruitment/jobs/new", element: <JobForm /> },
              { path: "recruitment/jobs/:id", element: <JobDetail /> },
              { path: "recruitment/jobs/:id/edit", element: <JobForm /> },
              { path: "recruitment/candidates", element: <CandidatesList /> },
              { path: "recruitment/candidates/new", element: <CandidateForm /> },
              { path: "recruitment/candidates/:id", element: <CandidateDetail /> },
              { path: "recruitment/candidates/:id/edit", element: <CandidateForm /> },
              { path: "recruitment/applications", element: <ApplicationsList /> },
            ],
          },
          {
            element: <RoleRoute section="audit" />,
            children: [
              { path: "audit/restaurants", element: <RestaurantsList /> },
              { path: "audit/restaurants/new", element: <RestaurantForm /> },
              { path: "audit/restaurants/:id", element: <RestaurantDetail /> },
              { path: "audit/restaurants/:id/edit", element: <RestaurantForm /> },
              { path: "audit/audits", element: <AuditsList /> },
              { path: "audit/audits/new", element: <AuditForm /> },
              { path: "audit/audits/:id", element: <AuditDetail /> },
              { path: "audit/audits/:id/edit", element: <AuditEdit /> },
              { path: "audit/checklists", element: <AuditTemplatesList /> },
              { path: "audit/checklists/new", element: <AuditTemplateBuilder /> },
              { path: "audit/checklists/:id", element: <AuditTemplateBuilder /> },

{ path: "audit/service", element: <ServiceAuditsList /> },
              { path: "audit/service/new", element: <ServiceAuditForm /> },
{ path: "audit/service/analytics", element: <ServiceAuditAnalytics /> },
              { path: "audit/standard", element: <StandardAuditsList /> },
              { path: "audit/standard/new", element: <StandardAuditForm /> },
              { path: "audit/standard/:id", element: <StandardAuditDetail /> },
              { path: "audit/standard/analytics", element: <StandardAuditAnalytics /> },
              { path: "audit/safety", element: <SafetyAuditsList /> },
              { path: "audit/safety/new", element: <SafetyAuditForm /> },
              { path: "audit/safety/:id", element: <SafetyAuditDetail /> },
              { path: "audit/safety/analytics", element: <SafetyAuditAnalytics /> },
              { path: "audit", element: <AuditHome /> },
              { path: "audit/dashboard", element: <AuditDashboard /> },
              { path: "audit/notifications", element: <AuditNotificationsList /> },
              { path: "audit/analytics", element: <AuditAnalytics /> },
              { path: "audit/report/:id", element: <AuditReportDetail /> },
              { path: "audit/execution/:id", element: <AuditExecutionPage /> },
            ],
          },
          {
            element: <RoleRoute section="users" />,
            children: [
              { path: "users", element: <UsersList /> },
              { path: "users/new", element: <UserForm /> },
              { path: "users/:id/edit", element: <UserForm /> },
            ],
          },
          {
            element: <RoleRoute section="departments" />,
            children: [{ path: "departments", element: <DepartmentsList /> }],
          },
          {
            element: <RoleRoute section="roles" />,
            children: [{ path: "roles", element: <RolesOverview /> }],
          },
          {
            element: <RoleRoute section="activityLog" />,
            children: [{ path: "activity-log", element: <ActivityLogList /> }],
          },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
];

export default ROUTES;
