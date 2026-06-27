export const PERMISSIONS = [
  "dashboard.view",
  "users.view",
  "users.manage",
  "users.role",
  "users.impersonate",
  "users.delete",
  "content.view",
  "content.moderate",
  "reports.view",
  "reports.manage",
  "communities.view",
  "communities.manage",
  "announcements.view",
  "announcements.manage",
  "settings.view",
  "settings.manage",
  "roles.view",
  "roles.manage",
  "audit.view",
  "verification.view",
  "verification.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type UserRole = "user" | "support" | "moderator" | "admin";

export interface AdminMe {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

export interface AdminProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  isVerified: boolean;
  role: UserRole;
  isSuspended: boolean;
  suspendedUntil: string | null;
  isBanned: boolean;
  createdAt: string;
}

export interface UserDetail extends AdminProfile {
  bio: string | null;
  location: string | null;
  coverUrl: string | null;
  postCount: number;
}

export interface Metrics {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    verified: number;
    suspended: number;
    banned: number;
  };
  content: {
    posts: number;
    postsThisWeek: number;
    comments: number;
    reels: number;
    activeStories: number;
    reactions: number;
  };
  communities: { groups: number; pages: number };
  moderation: { openReports: number; pendingVerifications: number };
}

export interface GrowthPoint {
  day: string;
  signups: number;
  posts: number;
}

export interface Paged<T> {
  items: T[];
  total?: number;
  limit: number;
  offset: number;
}

export interface PostRow {
  id: number;
  authorId: string;
  content: string;
  privacy: string;
  hidden: boolean;
  pinned: boolean;
  featured: boolean;
  createdAt: string;
  author: AdminProfile | null;
}

export interface CommentRow {
  id: number;
  authorId: string;
  content: string;
  hidden: boolean;
  createdAt: string;
  author: AdminProfile | null;
}

export interface ReelRow {
  id: number;
  authorId: string;
  caption: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  hidden: boolean;
  featured: boolean;
  createdAt: string;
  author: AdminProfile | null;
}

export interface StoryRow {
  id: number;
  authorId: string;
  caption: string | null;
  mediaUrl: string;
  mediaType: string;
  hidden: boolean;
  createdAt: string;
  expiresAt: string;
  author: AdminProfile | null;
}

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTargetType = "post" | "comment" | "user" | "reel" | "story";

export interface ReportRow {
  id: number;
  reporterId: string | null;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  handledBy: string | null;
  createdAt: string;
  reporter: AdminProfile | null;
  handler: AdminProfile | null;
}

export interface GroupRow {
  id: number;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  privacy: string;
  featured: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface PageRow {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  avatarUrl: string | null;
  featured: boolean;
  isApproved: boolean;
  createdAt: string;
}

export type AnnouncementLevel = "info" | "warning" | "critical";

export interface AnnouncementRow {
  id: number;
  title: string;
  body: string;
  level: AnnouncementLevel;
  active: boolean;
  createdBy: string;
  expiresAt: string | null;
  createdAt: string;
}

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationRow {
  id: number;
  userId: string;
  note: string | null;
  status: VerificationStatus;
  reviewNote: string | null;
  handledBy: string | null;
  createdAt: string;
  user: AdminProfile | null;
  handler: AdminProfile | null;
}

export interface SettingsResponse {
  flags: Record<string, boolean>;
  settings: Record<string, string>;
  flagDefaults: Record<string, boolean>;
  settingDefaults: Record<string, string>;
}

export interface RoleEntry {
  role: UserRole;
  permissions: Permission[];
  defaults: Permission[];
  editable: boolean;
}

export interface RolesResponse {
  catalog: Permission[];
  roles: RoleEntry[];
}

export interface AuditRow {
  id: number;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: AdminProfile | null;
}
