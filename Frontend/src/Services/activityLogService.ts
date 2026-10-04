import api from "../api/axios";
import type { ActivityLogEntry } from "../Types/core";

interface ActivityLogsResponse {
  activityLogs: ActivityLogEntry[];
}

interface ActivityLogResponse {
  activityLog: ActivityLogEntry;
}

export async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  const response = await api.get<ActivityLogsResponse>("/activity-logs");
  return response.data.activityLogs;
}

export async function logActivity(params: {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
}): Promise<ActivityLogEntry> {
  const response = await api.post<ActivityLogResponse>(
    "/activity-logs",
    params,
  );

  return response.data.activityLog;
}
