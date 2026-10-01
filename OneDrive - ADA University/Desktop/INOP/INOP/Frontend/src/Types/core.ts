export interface Department {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
}
