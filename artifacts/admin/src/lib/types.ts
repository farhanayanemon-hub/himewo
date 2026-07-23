export const PERMISSIONS = [
  "dashboard.view",
  "users.view",
  "users.manage",
  "users.role",
  "users.impersonate",
  "users.delete",
  "content.view",
  "content.moderate",
  "messages.view",
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
  "earnings.view",
  "earnings.manage",
  "ads.view",
  "ads.manage",
  "shop.view",
  "shop.manage",
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

export interface ConvLastMessage {
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  deleted: boolean;
}

export interface ConversationRow {
  id: number;
  type: string;
  title: string | null;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  participants: AdminProfile[];
  otherParticipants: AdminProfile[];
  lastMessage: ConvLastMessage | null;
}

export interface AdminMessageAttachment {
  id: number;
  url: string;
  type: string;
  name: string | null;
  thumbnailUrl: string | null;
}

export interface AdminMessage {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  type: string;
  replyToId: number | null;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  sender: AdminProfile | null;
  attachments: AdminMessageAttachment[];
}

export interface ConversationThread {
  conversation: {
    id: number;
    type: string;
    title: string | null;
    createdAt: string;
    participants: AdminProfile[];
  };
  items: AdminMessage[];
  total?: number;
  limit: number;
  offset: number;
}

export interface PointConfig {
  enabled: boolean;
  pointsPerPost: number;
  pointsPerLike: number;
  pointsPerComment: number;
  pointsPerShare: number;
  pointsPerDollar: number;
  minWithdrawDollars: number;
  dailyPointCap: number;
  updatedAt: string | null;
}

export type PointConfigUpdate = Partial<Omit<PointConfig, "updatedAt">>;

export type WithdrawalStatus = "pending" | "approved" | "paid" | "rejected";

export interface AdminWithdrawalRequest {
  id: number;
  userId: string;
  amountDollars: number;
  pointsSpent: number;
  method: string;
  details: Record<string, string>;
  status: WithdrawalStatus;
  adminNote: string | null;
  processedBy: string | null;
  createdAt: string;
  processedAt: string | null;
  user: AdminProfile | null;
}

export interface AdjustPointsResult {
  balancePoints: number;
  balanceDollars: number;
}

export interface AdminEarningsSummary {
  totalPaidDollars: number;
  pendingPayoutDollars: number;
  pendingPayoutCount: number;
  outstandingPoints: number;
  outstandingDollars: number;
}

export type AdReviewStatus = "pending" | "approved" | "rejected";

export interface AdCreativeRow {
  id: number;
  name: string;
  format: string;
  headline: string | null;
  primaryText: string | null;
  description: string | null;
  callToAction: string | null;
  mediaUrls: string[];
  linkUrl: string | null;
}

export interface AdRow {
  id: number;
  accountId: number;
  name: string;
  status: string;
  reviewStatus: AdReviewStatus;
  reviewNote: string | null;
  destinationUrl: string | null;
  boostedPostId: number | null;
  boostedPageId: number | null;
  createdAt: string;
  accountName: string | null;
  owner: AdminProfile | null;
  campaignName: string | null;
  objective: string | null;
  creative: AdCreativeRow | null;
}

/* --------------------------------- Shop -------------------------------- */

export type ShopOrderStatus =
  | "awaiting_verification"
  | "pending"
  | "confirmed"
  | "delivered"
  | "completed"
  | "cancelled";

export type ShopPaymentMethod = "cod" | "direct";

export type ShopWithdrawalStatus = "pending" | "approved" | "rejected";

export interface ShopStallRow {
  id: number;
  userId: string;
  pageId: number;
  name: string;
  avatarUrl: string | null;
  active: boolean;
  productCount: number;
  orderCount: number;
  createdAt: string;
  owner: AdminProfile | null;
}

export interface ShopProductRow {
  id: number;
  stallId: number;
  stallName: string | null;
  photos: string[];
  name: string;
  priceCents: number;
  description: string;
  stockQty: number;
  active: boolean;
  createdAt: string;
}

export interface ShopOrderRow {
  id: number;
  productId: number;
  stallId: number;
  sellerId: string;
  buyerId: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  productName: string;
  productPhoto: string | null;
  stallName: string | null;
  deliveryAddress: string;
  phone: string;
  paymentMethod: ShopPaymentMethod;
  paymentRef: string | null;
  heldCents: number;
  status: ShopOrderStatus;
  createdAt: string;
  counterpart: AdminProfile | null;
}

export interface ShopWithdrawalRow {
  id: number;
  sellerId: string;
  stallId: number;
  amountCents: number;
  method: string;
  details: Record<string, string>;
  status: ShopWithdrawalStatus;
  adminNote: string | null;
  processedBy: string | null;
  createdAt: string;
  processedAt: string | null;
  seller: AdminProfile | null;
  stallName: string | null;
}

export interface ShopSummary {
  platformProfitCents: number;
  heldFundsCents: number;
  stallCount: number;
  orderCount: number;
  pendingPaymentCount: number;
  pendingWithdrawalCount: number;
}

export interface ShopSettings {
  commissionPercent: number;
  paymentInstructions: string;
}
