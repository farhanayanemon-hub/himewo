import React from "react";

interface HiMewoLogoProps {
  size?: number | "sm" | "md" | "lg" | "xl";
  withText?: boolean;
  className?: string;
  glow?: boolean;
  isChat?: boolean;
}

/**
 * HiMewo Official Standalone Icon Mastermark:
 * - Standalone bold icon emblem (NO text by default)
 * - Main Social App: Zoomed Authentic Pixel Cat (Clean Squircle)
 * - Standalone Chat App: Option 2 Pure White Messenger Bubble with Speech Tail
 */
export function OriginalPixelCatLogo({
  size = 52,
  className = "",
  glow = false,
  isChat = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
  isChat?: boolean;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 hover:scale-105 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <div className="w-full h-full flex items-center justify-center bg-transparent overflow-hidden">
        <img
          src={
            isChat
              ? "/original_user_pixel_cat_chat_white_bubble.png"
              : "/original_user_pixel_cat_zoomed.png"
          }
          alt={isChat ? "HiMewo Chat Logo" : "HiMewo Logo"}
          className="w-full h-full object-contain rounded-2xl"
        />
      </div>
      {isChat && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 ring-2 ring-background text-[9px] font-bold text-black shadow-md">
          💬
        </span>
      )}
    </div>
  );
}

export function HiMewoLogo({
  size = "md",
  withText = false, // Standalone icon by default (NO text beside logo)
  className = "",
  glow = false,
  isChat = false,
}: HiMewoLogoProps) {
  const pixelSizes = {
    sm: 40,
    md: 52,
    lg: 68,
    xl: 88,
  };

  const iconPx = typeof size === "number" ? size : pixelSizes[size] || 52;
  const textClasses = {
    sm: "text-xl",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
    xl: "text-4xl md:text-5xl",
  };
  const textSize = typeof size === "string" ? textClasses[size] : "text-2xl md:text-3xl";

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      <OriginalPixelCatLogo size={iconPx} glow={glow} isChat={isChat} />
      {withText && (
        <span
          className={`font-black tracking-tight text-white select-none ${textSize}`}
        >
          HiMewo {isChat && <span className="text-purple-400 text-xl font-bold ml-1.5">Chat</span>}
        </span>
      )}
    </div>
  );
}

// Backward compatibility alias
export {
  OriginalPixelCatLogo as Variation8HDLogo,
  OriginalPixelCatLogo as Variation8OriginalLogo,
  OriginalPixelCatLogo as Variation8Glyph,
  OriginalPixelCatLogo as Variation8Logo,
  OriginalPixelCatLogo as PixelCatIcon,
  OriginalPixelCatLogo as MewoEmblemIcon,
  OriginalPixelCatLogo as CelestialAuroraMewo,
};
export default HiMewoLogo;
