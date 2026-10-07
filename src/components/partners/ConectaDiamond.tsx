// Diamante Conecta 360's mark in the partner portal header: the brand's
// white crystalline diamond on the dark-green brand tile. Its own small
// SVG — the CRM's floating diamond button (shell/Miadiamante.tsx) is left
// untouched.
export function ConectaDiamond({ className }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md bg-primary ${className ?? "size-9"}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-[70%]">
        <polygon points="12,2 19,8 12,22 5,8" fill="#ffffff" stroke="#78b7d0" strokeWidth="0.75" strokeLinejoin="round" />
        <polygon points="12,2 19,8 12,11 5,8" fill="#eaf5fa" />
        <polygon points="5,8 12,11 12,22" fill="#ffffff" />
        <polygon points="19,8 12,11 12,22" fill="#dcedf4" />
        <line x1="5" y1="8" x2="19" y2="8" stroke="#78b7d0" strokeWidth="0.4" opacity="0.6" />
      </svg>
    </span>
  );
}
