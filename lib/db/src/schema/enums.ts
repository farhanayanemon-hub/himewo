import { pgEnum } from "drizzle-orm/pg-core";

export const reactionTypeEnum = pgEnum("reaction_type", [
  "like",
  "love",
  "care",
  "haha",
  "wow",
  "sad",
  "angry",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "image",
  "video",
  "file",
  "audio",
]);

export const conversationTypeEnum = pgEnum("conversation_type", [
  "direct",
  "group",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "video",
  "file",
  "audio",
  "sticker",
  "call",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "member",
  "moderator",
  "admin",
]);

export const groupMemberStatusEnum = pgEnum("group_member_status", [
  "active",
  "pending",
  "banned",
]);

export const friendRequestStatusEnum = pgEnum("friend_request_status", [
  "pending",
  "accepted",
  "declined",
]);

export const privacyEnum = pgEnum("privacy", [
  "public",
  "friends",
  "private",
  "hidden",
]);

export const presenceStatusEnum = pgEnum("presence_status", [
  "online",
  "offline",
  "away",
]);

export const callTypeEnum = pgEnum("call_type", ["audio", "video"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "reaction",
  "comment",
  "friend_request",
  "friend_accept",
  "follow",
  "message",
  "group_invite",
  "page_follow",
  "page_invite",
  "mention",
  "share",
  "story_view",
  "announcement",
  "verification",
  "shop_order",
  "shop_withdrawal",
]);

// ---------------------------------------------------------------------------
// Admin / platform-governance enums (Admin Panel suite).
// ---------------------------------------------------------------------------

// Platform-level role. Drives the admin panel access gate and RBAC.
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "support",
  "moderator",
  "admin",
]);

// Moderation report lifecycle.
export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

// What a report points at. targetId is stored as text to hold either a uuid
// (user) or a numeric id (post/comment/reel/story).
export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "post",
  "comment",
  "user",
  "reel",
  "story",
]);

// Severity/visual treatment of a broadcast announcement.
export const announcementLevelEnum = pgEnum("announcement_level", [
  "info",
  "warning",
  "critical",
]);

// Blue-tick verification request lifecycle.
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
]);
