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

export const memberRoleEnum = pgEnum("member_role", ["member", "admin"]);

export const friendRequestStatusEnum = pgEnum("friend_request_status", [
  "pending",
  "accepted",
  "declined",
]);

export const privacyEnum = pgEnum("privacy", ["public", "friends", "private"]);

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
  "mention",
  "share",
  "story_view",
]);
