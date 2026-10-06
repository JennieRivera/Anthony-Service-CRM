import {
  Briefcase,
  Camera,
  Clapperboard,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  Music2,
  Phone,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ConversationMessage } from "@/lib/db/schema";

export type Channel = ConversationMessage["channel"];

// Icon and color per conversation_channel — every enum value needs an
// entry or this Record fails to type-check. lucide-react doesn't ship
// trademarked brand logos (no Facebook/Instagram/YouTube/TikTok/LinkedIn/
// Google icon), so those use generic stand-ins. Colors are text classes
// that pass AA on the white card background.
export const CHANNEL_META: Record<Channel, { icon: LucideIcon; color: string }> = {
  email: { icon: Mail, color: "text-sky-700" },
  call: { icon: Phone, color: "text-emerald-700" },
  whatsapp: { icon: MessageCircle, color: "text-green-700" },
  sms: { icon: MessageSquare, color: "text-violet-700" },
  facebook_messenger: { icon: MessageSquareText, color: "text-blue-700" },
  instagram_dm: { icon: Camera, color: "text-pink-700" },
  youtube: { icon: Clapperboard, color: "text-red-700" },
  tiktok: { icon: Music2, color: "text-zinc-800" },
  linkedin: { icon: Briefcase, color: "text-sky-800" },
  google_business: { icon: Star, color: "text-amber-700" },
  website_chat: { icon: Globe, color: "text-teal-700" },
  highlevel: { icon: Zap, color: "text-orange-700" },
  in_person: { icon: MapPin, color: "text-rose-700" },
  other: { icon: MoreHorizontal, color: "text-muted-foreground" },
};

// Rows written by the automatic notices engine (src/lib/notifications/
// engine.ts) carry this marker instead of a staff email.
export const AUTOMATIC_NOTICE_AUTHOR = "system:automatic-notices";
