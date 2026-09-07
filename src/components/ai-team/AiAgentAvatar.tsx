import { cn } from "@/lib/utils";

// Section 8 — illustrated avatar system, with an uploaded image (Session 3)
// taking priority over the illustration once an agent has one. Deliberately
// simple shapes for the fallback, not a photorealistic or talking avatar —
// section 1 calls for "avatares bien diseñados... con animación simple",
// explicitly not video.
export function AiAgentAvatar({
  style,
  accentColor,
  agentId,
  hasUploadedImage = false,
  dimmed = false,
  size = 72,
  className,
}: {
  style: "human" | "robot";
  accentColor: string;
  agentId?: string;
  hasUploadedImage?: boolean;
  dimmed?: boolean;
  size?: number;
  className?: string;
}) {
  const wrapperStyle = {
    width: size,
    height: size,
    animation: dimmed ? "none" : "ai-avatar-float 4s ease-in-out infinite",
    opacity: dimmed ? 0.5 : 1,
  };

  if (hasUploadedImage && agentId) {
    return (
      <div
        className={cn("ai-avatar-float overflow-hidden rounded-full", className)}
        style={wrapperStyle}
      >
        {/* next/image's optimizer fetches server-side without the viewer's
            session cookie, which this authenticated route requires — a
            plain <img> (same-origin, cookie sent normally) is correct here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/ai-agents/${agentId}/avatar`}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("ai-avatar-float", className)} style={wrapperStyle}>
      <svg
        viewBox="0 0 72 72"
        width={size}
        height={size}
        role="img"
        aria-hidden="true"
      >
        <circle cx="36" cy="36" r="34" fill={accentColor} fillOpacity="0.16" />
        {style === "human" ? (
          <>
            <circle cx="36" cy="29" r="13" fill={accentColor} />
            <path
              d="M14 60c1-12 10-20 22-20s21 8 22 20"
              fill={accentColor}
            />
            <circle cx="31" cy="27" r="2.4" fill="white" />
            <circle cx="41" cy="27" r="2.4" fill="white" />
            <path
              d="M30 34c2 2.5 10 2.5 12 0"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <rect x="34" y="6" width="4" height="12" rx="2" fill={accentColor} />
            <circle cx="36" cy="6" r="3.5" fill={accentColor} />
            <rect
              x="14"
              y="16"
              width="44"
              height="36"
              rx="10"
              fill={accentColor}
            />
            <rect x="23" y="29" width="9" height="9" rx="2.5" fill="white" />
            <rect x="40" y="29" width="9" height="9" rx="2.5" fill="white" />
            <rect
              x="26"
              y="44"
              width="20"
              height="3"
              rx="1.5"
              fill="white"
              fillOpacity="0.85"
            />
            <path
              d="M15 62c1-8 9-13 21-13s20 5 21 13"
              fill={accentColor}
              fillOpacity="0.55"
            />
          </>
        )}
      </svg>
    </div>
  );
}
