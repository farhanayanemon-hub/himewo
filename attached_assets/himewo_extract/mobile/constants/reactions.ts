import { ReactionType } from "@workspace/api-client-react";

export interface ReactionConfig {
  emoji: string;
  color: string;
  label: string;
}

export const reactionConfig: Record<ReactionType, ReactionConfig> = {
  [ReactionType.like]: { emoji: "👍", color: "#1877f2", label: "Like" },
  [ReactionType.love]: { emoji: "❤️", color: "#f33e58", label: "Love" },
  [ReactionType.care]: { emoji: "🥰", color: "#f7b125", label: "Care" },
  [ReactionType.haha]: { emoji: "😆", color: "#f7b125", label: "Haha" },
  [ReactionType.wow]: { emoji: "😮", color: "#f7b125", label: "Wow" },
  [ReactionType.sad]: { emoji: "😢", color: "#f7b125", label: "Sad" },
  [ReactionType.angry]: { emoji: "😡", color: "#e9710f", label: "Angry" },
};

export const reactionOrder: ReactionType[] = [
  ReactionType.like,
  ReactionType.love,
  ReactionType.care,
  ReactionType.haha,
  ReactionType.wow,
  ReactionType.sad,
  ReactionType.angry,
];

// A compact emoji set for the message / comment emoji picker (user content).
export const emojiCategories: { name: string; emojis: string[] }[] = [
  {
    name: "Smileys",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰",
      "😘", "😜", "🤪", "🤔", "🤨", "😐", "😴", "😎", "🥳", "😭",
      "😡", "🤬", "😱", "😳", "🥺", "😬", "🙄", "😏", "😅", "😆",
    ],
  },
  {
    name: "Gestures",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤙", "👏", "🙌", "🙏",
      "💪", "👋", "🤝", "✊", "👊", "🫶", "👀", "🧠", "💯", "🔥",
    ],
  },
  {
    name: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️",
      "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💋",
    ],
  },
  {
    name: "Fun",
    emojis: [
      "🎉", "🎊", "🎁", "🎈", "🌟", "⭐", "✨", "⚡", "🌈", "☀️",
      "🍕", "🍔", "🍟", "🍿", "🍩", "🍰", "☕", "🍻", "⚽", "🏆",
    ],
  },
];
