import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import AppShell from "../Layouts/AppShell/AppShell";
import Login from "../Pages/Auth/Login/Login";
import Dashboard from "../Pages/Dashboard/Dashboard";
import JobsList from "../Pages/Recruitment/Jobs/JobsList";
import JobForm from "../Pages/Recruitment/Jobs/JobForm";
import JobDetail from "../Pages/Recruitment/Jobs/JobDetail";
import CandidatesList from "../Pages/Recruitment/Candidates/CandidatesList";
import CandidateForm from "../Pages/Recruitment/Candidates/CandidateForm";
import CandidateDetail from "../Pages/Recruitment/Candidates/CandidateDetail";
import ApplicationsList from "../Pages/Recruitment/Applications/ApplicationsList";
import RestaurantsList from "../Pages/Audit/Restaurants/RestaurantsList";
import RestaurantForm from "../Pages/Audit/Restaurants/RestaurantForm";
import RestaurantDetail from "../Pages/Audit/Restaurants/RestaurantDetail";
import AuditsList from "../Pages/Audit/Audits/AuditsList";
import AuditForm from "../Pages/Audit/Audits/AuditForm";
import AuditDetail from "../Pages/Audit/Audits/AuditDetail";
import AuditAnalytics from "../Pages/Audit/Analytics/AuditAnalytics";
import UsersList from "../Pages/Users/UsersList";
import UserForm from "../Pages/Users/UserForm";
import DepartmentsList from "../Pages/Departments/DepartmentsList";
import RolesOverview from "../Pages/Roles/RolesOverview";
import ActivityLogList from "../Pages/ActivityLog/ActivityLogList";
import NotFound from "../Pages/NotFound/NotFound";
import Unauthorized from "../Pages/Unauthorized/Unauthorized";

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
              { path: "audit/analytics", element: <AuditAnalytics /> },
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
