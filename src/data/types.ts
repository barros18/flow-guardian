export type PRStatus = "open" | "closed" | "merged";
export type BuildStatus = "success" | "failure" | "running" | "pending";
export type AlertType = "no_activity" | "approved_no_merge" | "build_failed" | "no_task";
export type AlertSeverity = "normal" | "critical";
export type UserRole = "admin" | "lead" | "developer";

export interface PRAuthor {
  name: string;
  avatar: string;
}

export interface JiraTask {
  key: string;
  title: string;
}

export interface PRAlert {
  type: AlertType;
  severity: AlertSeverity;
}

export interface TimelineEvent {
  event: string;
  timestamp: Date;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  branch: string;
  author: PRAuthor;
  repository: string;
  status: PRStatus;
  buildStatus: BuildStatus;
  jiraTask: JiraTask | null;
  reviewers: PRAuthor[];
  approvals: number;
  changesRequested: boolean;
  createdAt: Date;
  lastActivity: Date;
  blockedExternally: boolean;
  alerts: PRAlert[];
  timeline: TimelineEvent[];
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  prId: string;
  prTitle: string;
  prNumber: number;
  author: string;
  jiraTask: string | null;
  status: "open" | "resolved";
  createdAt: Date;
  message: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  hours: number;
}
