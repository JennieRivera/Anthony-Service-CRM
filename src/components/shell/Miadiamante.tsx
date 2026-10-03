"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Minus, X, Send, Users, GraduationCap, Network, BarChart3, ListChecks, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Position = { x: number; y: number };
type PanelState = "closed" | "minimized" | "open";

const BUTTON_SIZE = 56;
const DEFAULT_MARGIN = 24;
// FloatingCalculator already docks at { right: 24, bottom: 24 } — offset
// MIADIAMANTE's own default (never-dragged) position one button-width to
// its left so both launchers are visible out of the box, rather than
// stacking exactly on top of each other.
const DEFAULT_RIGHT = DEFAULT_MARGIN + BUTTON_SIZE + 16;
const DRAG_THRESHOLD = 4;
const PANEL_WIDTH = 320;
// AMS Visual Correction — bumped from the original 440 so the avatar
// header (see AvatarFrame, now a 144px official photo) has room without
// cramping the quick-nav/input sections below; the middle section is
// already independently scrollable (overflow-y-auto), so this is a
// sizing-only change, not a layout restructure.
const PANEL_HEIGHT = 520;
const PANEL_GAP = 12;
// FloatingCalculator's own default (never-dragged) PANEL sits at
// { right: 24, bottom: 96 } with a 288px width (its own DEFAULT_MARGIN /
// PANEL_WIDTH) — the two launcher buttons already sit side by side without
// overlapping, but both panels are far wider than the 96px gap between the
// buttons, so opening both at their default position collided. Anchor
// MIADIAMANTE's default panel/minimized-pill far enough to the calculator
// panel's left that the two never overlap, independent of where either
// launcher button sits. Only the default (position === null) case uses
// this — a manually dragged position is never overridden here.
const DEFAULT_PANEL_RIGHT = 24 + 288 + 16;
const STORAGE_KEY = "miadiamante-ui-prefs";

// Presentation-only preference (position + open/minimized state), never
// conversation content or CRM data — see the brief's explicit localStorage
// safety rule. Wrapped defensively since localStorage can throw (private
// browsing, blocked storage) and must never break the shell if it does.
function loadPrefs(): { position: Position | null; state: PanelState } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { position: null, state: "closed" };
    const parsed = JSON.parse(raw);
    const state: PanelState =
      parsed.state === "open" || parsed.state === "minimized" ? parsed.state : "closed";
    const position =
      parsed.position && typeof parsed.position.x === "number" && typeof parsed.position.y === "number"
        ? { x: parsed.position.x, y: parsed.position.y }
        : null;
    return { position, state };
  } catch {
    return { position: null, state: "closed" };
  }
}

function savePrefs(position: Position | null, state: PanelState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, state }));
  } catch {
    // Storage unavailable — the shell still works, it just won't
    // remember position/state for next time.
  }
}

// A small inline SVG rather than a stock lucide icon — the brief asks for
// a specific "bright white crystalline diamond" identity (white facets,
// a soft sky-blue reflection, an icy highlight), which no single existing
// icon captures. Kept intentionally simple/lightweight (flat fills, no
// filters beyond the existing miadiamante-shimmer CSS animation) per the
// brief's performance section.
function DiamondMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon points="12,2 19,8 12,22 5,8" fill="#ffffff" stroke="#78b7d0" strokeWidth="0.75" strokeLinejoin="round" />
      <polygon points="12,2 19,8 12,11 5,8" fill="#eaf5fa" />
      <polygon points="5,8 12,11 12,22" fill="#ffffff" />
      <polygon points="19,8 12,11 12,22" fill="#dcedf4" />
      <line x1="5" y1="8" x2="19" y2="8" stroke="#78b7d0" strokeWidth="0.4" opacity="0.6" />
    </svg>
  );
}

// MIADIAMANTE — approved official avatar (owner-provided, integrated
// verbatim; see public/miadiamante/avatar.png). The file is byte-for-byte
// identical to the approved source image — never regenerated, recolored,
// or redrawn. It is already a finished, self-contained circular badge
// (professional Latina executive, AMS-branded notebook + pen, blue/white/
// gold ring) rendered on a square 1254x1254 canvas with an OPAQUE white
// matte (no alpha channel) around that circle.
//
// Sizing/crop choice: the container below is `rounded-full overflow-
// hidden` with the image at `object-cover` on a 1:1 (square) box. Because
// the source is already exactly square, object-cover performs NO pixel
// cropping of the circular badge itself (same aspect ratio in and out) —
// it only lets the circular CSS mask trim the few corner slivers of
// blank white canvas OUTSIDE the image's own ring. Nothing in the
// portrait, notebook, pen, or AMS branding is cut. This is what the
// Light Mode screenshot confirmed is a clean fit, and it also avoids a
// harsh opaque-white square appearing on Dark Mode's dark card
// background (there is no transparency in the source to rely on
// instead).
function AvatarFrame({ label }: { label: string }) {
  return (
    <div className="relative" role="img" aria-label={label}>
      <div className="relative h-36 w-36 overflow-hidden rounded-full shadow-[0_0_16px_3px_rgba(120,183,208,0.4)]">
        <Image
          src="/miadiamante/avatar.png"
          alt={label}
          fill
          sizes="144px"
          priority
          className="object-cover"
        />
      </div>
      {/* Diamond brand badge — keeps the crystalline diamond identity
          present as an accent even though the avatar is now the open
          panel's primary visual; the launcher button (closed/minimized
          state) remains the diamond's main appearance, unchanged. */}
      <div className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--info)]/60 bg-white shadow-md">
        <DiamondMark className="h-5 w-5" />
      </div>
    </div>
  );
}

const CATEGORY_LINKS = [
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/academy", labelKey: "academy", icon: GraduationCap },
  { href: "/community", labelKey: "community", icon: Network },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/tasks", labelKey: "tasks", icon: ListChecks },
  { href: "/documents", labelKey: "documents", icon: FileText },
] as const;

// MIADIAMANTE — AMS Executive Assistant. INTERNAL ONLY shell for this
// phase (brief sections 16/17/23): no live AI provider is connected, so
// this component never simulates understanding a request, querying CRM
// data, or taking any action. It is explicitly, visibly "Ready for AI
// Connection" — the same honest phrasing already established for the AI
// Team cards (AiAgentExecutionStatus.ready_for_ai_connection) — and the
// category shortcuts below are real navigation links to existing pages,
// never fake actions. Hard-separated from Christal (AI Client Concierge,
// external-facing, its own existing component/record) — this component
// shares no identity, state, storage key, or UI with it.
export function Miadiamante() {
  const t = useTranslations("Miadiamante");
  const tNav = useTranslations("Nav");

  // position/state/hydrated are combined into one object so the
  // post-mount localStorage restore (below) is a single setState call —
  // three separate calls in one effect risks cascading renders.
  const [prefs, setPrefsState] = useState<{ hydrated: boolean; position: Position | null; state: PanelState }>({
    hydrated: false,
    position: null,
    state: "closed",
  });
  const { hydrated, position, state } = prefs;
  const [dragging, setDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const dragOrigin = useRef<{ pointerX: number; pointerY: number; posX: number; posY: number } | null>(null);
  const movedRef = useRef(false);

  function setPosition(next: Position) {
    setPrefsState((p) => ({ ...p, position: next }));
  }
  function setState(next: PanelState | ((prev: PanelState) => PanelState)) {
    setPrefsState((p) => ({ ...p, state: typeof next === "function" ? next(p.state) : next }));
  }

  // Restore the viewer's own prior position/state once, after mount —
  // never during render/SSR, since localStorage doesn't exist there.
  // Deferred one tick (same pattern as NavDrawer.tsx's own close-on-
  // navigate fix) specifically because the React Compiler's lint rule
  // flags a setState called synchronously inside an effect as a
  // cascading-render risk; queuing it as a microtask keeps the exact
  // same one-time-restore behavior without tripping that rule.
  useEffect(() => {
    queueMicrotask(() => {
      const restored = loadPrefs();
      setPrefsState({ hydrated: true, position: restored.position, state: restored.state });
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePrefs(position, state);
  }, [hydrated, position, state]);

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    dragOrigin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position?.x ?? rect.left,
      posY: position?.y ?? rect.top,
    };
    movedRef.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.pointerX;
    const dy = e.clientY - dragOrigin.current.pointerY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
    }
    const maxX = window.innerWidth - BUTTON_SIZE;
    const maxY = window.innerHeight - BUTTON_SIZE;
    setPosition({
      x: Math.min(Math.max(dragOrigin.current.posX + dx, 0), maxX),
      y: Math.min(Math.max(dragOrigin.current.posY + dy, 0), maxY),
    });
  }

  function handlePointerUp() {
    dragOrigin.current = null;
    setDragging(false);
    if (!movedRef.current) {
      setState((s) => (s === "open" ? "closed" : "open"));
    }
  }

  function panelStyle(pos: Position): CSSProperties {
    const style: CSSProperties = {};
    if (pos.y > window.innerHeight / 2) {
      style.bottom = window.innerHeight - pos.y + PANEL_GAP;
    } else {
      style.top = Math.min(pos.y + BUTTON_SIZE + PANEL_GAP, window.innerHeight - PANEL_HEIGHT - PANEL_GAP);
    }
    if (pos.x > window.innerWidth - PANEL_WIDTH) {
      style.right = Math.max(window.innerWidth - (pos.x + BUTTON_SIZE), 0);
    } else {
      style.left = pos.x;
    }
    return style;
  }

  if (!hydrated) return null;

  const welcomePanel = (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border p-4 text-center">
        <AvatarFrame label={t("avatarAlt")} />
        <div>
          <p className="font-heading text-base leading-tight text-foreground">{t("name")}</p>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="rounded-lg border border-[var(--info)]/40 bg-[var(--info)]/10 px-3 py-2">
          <p className="text-xs font-medium text-foreground">{t("readyForConnection")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("readyForConnectionHint")}</p>
        </div>

        <p className="text-sm text-foreground">{t("greeting")}</p>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("quickNavigation")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setState("closed");
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--premium)]" />
                  <span>{tNav(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <input
            type="text"
            disabled
            placeholder={t("inputPlaceholder")}
            className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          />
          <button type="button" disabled aria-label={t("send")} className="text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: draggable floating launcher + free-positioned panel,
          same interaction model as FloatingCalculator. Hidden on small
          viewports in favor of the Sheet-based mobile variant below. */}
      <div className="hidden md:contents">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label={state === "open" ? t("close") : t("open")}
          style={{
            ...(position ? { left: position.x, top: position.y } : { right: DEFAULT_RIGHT, bottom: DEFAULT_MARGIN }),
          }}
          className={cn(
            // AMS Visual Correction (owner review pass) — strengthened from a
            // half-opacity border + a generic shadow-lg (which read as too
            // faint against the white workspace) to a solid icy-blue border
            // plus a soft sky-blue glow, while staying a WHITE circle (never
            // a solid-blue fill like FloatingCalculator) so the two floating
            // controls stay visually distinct at a glance.
            "fixed z-50 flex h-14 w-14 touch-none items-center justify-center rounded-full border-2 border-[var(--info)] bg-white shadow-[0_0_18px_4px_rgba(120,183,208,0.5),0_4px_10px_rgba(28,43,62,0.15)] transition-transform hover:scale-105",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          {state === "open" ? (
            <X className="h-6 w-6 text-muted-foreground" />
          ) : (
            <DiamondMark className={cn("h-7 w-7", !dragging && "miadiamante-shimmer")} />
          )}
        </button>

        {state === "minimized" && (
          <button
            type="button"
            onClick={() => setState("open")}
            style={position ? panelStyle(position) : { right: DEFAULT_PANEL_RIGHT, bottom: 92 }}
            className="fixed z-50 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-lg transition-colors hover:bg-muted"
          >
            <DiamondMark className="h-4 w-4" />
            {t("name")}
          </button>
        )}

        {state === "open" && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setState("closed")} aria-hidden="true" />
            <div
              style={{
                ...(position ? panelStyle(position) : { right: DEFAULT_PANEL_RIGHT, bottom: 92 }),
                width: PANEL_WIDTH,
                maxHeight: PANEL_HEIGHT,
              }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            >
              <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setState("minimized")}
                  aria-label={t("minimize")}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setState("closed")}
                  aria-label={t("close")}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {welcomePanel}
            </div>
          </>
        )}
      </div>

      {/* Mobile: a small fixed control (no drag) opening a bottom Sheet —
          brief section 21: no forced desktop drag behavior, must not
          block navigation or create horizontal overflow. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t("open")}
          // FloatingCalculator also has no mobile-hidden guard and docks
          // at bottom-6/right-6 on every viewport — stacked vertically
          // above it (not beside it) here since narrow phone widths have
          // less horizontal room to spare than vertical.
          // AMS Visual Correction — same strengthened icy-blue border/glow
          // as the desktop launcher above (see that button's comment);
          // this is the one the owner specifically flagged as too faint.
          className="fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--info)] bg-white shadow-[0_0_18px_4px_rgba(120,183,208,0.5),0_4px_10px_rgba(28,43,62,0.15)]"
        >
          <DiamondMark className="miadiamante-shimmer h-7 w-7" />
        </button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="flex h-[80vh] flex-col p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("name")}</SheetTitle>
            </SheetHeader>
            {welcomePanel}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
