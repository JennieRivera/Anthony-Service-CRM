"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import { Calculator as CalculatorIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Operator = "+" | "-" | "×" | "÷";
type Position = { x: number; y: number };

const BUTTON_SIZE = 56; // h-14 w-14
const DEFAULT_MARGIN = 24; // right-6 / bottom-6
const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag, not a click
const PANEL_WIDTH = 288; // w-72
const PANEL_GAP = 12;

function calculate(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? 0 : a / b;
  }
}

// Global quick-calc widget, mounted once in AppShell so it floats over
// every authenticated page — not a Dialog on purpose: a modal backdrop
// would block the page behind it, defeating the point of a "keep working
// while you calculate" tool. The transparent full-screen layer below
// closes it on an outside click without visually dimming the page.
export function FloatingCalculator() {
  const t = useTranslations("Calculator");
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Draggable position — stays null (letting the button render at its
  // default bottom-right CSS position) until the user's first drag; once
  // set, it's the single source of truth for both the button and the
  // panel's placement, so no ref is ever read during render.
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; posX: number; posY: number } | null>(null);
  const movedRef = useRef(false);

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    // Only reached from an event handler, never during render — safe to
    // read the ref here to learn the button's current on-screen position
    // the first time it's dragged (before `position` state exists).
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
      setOpen((v) => !v);
    }
  }

  // Opens the panel toward whichever side of the screen has more room,
  // so it stays fully visible no matter where the button was dragged.
  // Only called with a known (non-null) position — see the render below.
  function panelStyle(pos: Position): CSSProperties {
    const style: CSSProperties = {};
    if (pos.y > window.innerHeight / 2) {
      style.bottom = window.innerHeight - pos.y + PANEL_GAP;
    } else {
      style.top = pos.y + BUTTON_SIZE + PANEL_GAP;
    }
    if (pos.x > window.innerWidth - PANEL_WIDTH) {
      style.right = Math.max(window.innerWidth - (pos.x + BUTTON_SIZE), 0);
    } else {
      style.left = pos.x;
    }
    return style;
  }

  function reset() {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }

  function inputDigit(digit: string) {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  }

  function inputDecimal() {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(`${display}.`);
    }
  }

  function toggleSign() {
    setDisplay(String(parseFloat(display) * -1));
  }

  function inputPercent() {
    setDisplay(String(parseFloat(display) / 100));
  }

  function chooseOperator(next: Operator) {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator && !waitingForOperand) {
      setPreviousValue(calculate(previousValue, inputValue, operator));
    }

    setOperator(next);
    setWaitingForOperand(true);
  }

  function handleEquals() {
    if (operator === null || previousValue === null) return;
    const inputValue = parseFloat(display);
    setDisplay(String(calculate(previousValue, inputValue, operator)));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label={open ? t("close") : t("open")}
        style={position ? { left: position.x, top: position.y } : { right: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN }}
        className={cn(
          "fixed z-50 flex h-14 w-14 touch-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
          dragging ? "cursor-grabbing" : "cursor-grab",
          !dragging && !open && "ai-avatar-float",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <CalculatorIcon className="h-6 w-6" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            style={position ? panelStyle(position) : undefined}
            className={cn(
              "fixed z-50 w-72 rounded-xl border border-border bg-card p-3 shadow-xl",
              !position && "right-6 bottom-24",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-heading text-sm text-foreground">{t("title")}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 overflow-x-auto rounded-lg bg-muted px-3 py-4 text-right font-heading text-2xl whitespace-nowrap text-foreground">
              {display}
            </div>

            <div className="grid grid-cols-4 gap-2 text-sm font-medium">
              <CalcButton label="C" onClick={reset} variant="function" />
              <CalcButton label="±" onClick={toggleSign} variant="function" />
              <CalcButton label="%" onClick={inputPercent} variant="function" />
              <CalcButton label="÷" onClick={() => chooseOperator("÷")} variant="operator" active={operator === "÷"} />

              <CalcButton label="7" onClick={() => inputDigit("7")} />
              <CalcButton label="8" onClick={() => inputDigit("8")} />
              <CalcButton label="9" onClick={() => inputDigit("9")} />
              <CalcButton label="×" onClick={() => chooseOperator("×")} variant="operator" active={operator === "×"} />

              <CalcButton label="4" onClick={() => inputDigit("4")} />
              <CalcButton label="5" onClick={() => inputDigit("5")} />
              <CalcButton label="6" onClick={() => inputDigit("6")} />
              <CalcButton label="-" onClick={() => chooseOperator("-")} variant="operator" active={operator === "-"} />

              <CalcButton label="1" onClick={() => inputDigit("1")} />
              <CalcButton label="2" onClick={() => inputDigit("2")} />
              <CalcButton label="3" onClick={() => inputDigit("3")} />
              <CalcButton label="+" onClick={() => chooseOperator("+")} variant="operator" active={operator === "+"} />

              <CalcButton label="0" onClick={() => inputDigit("0")} className="col-span-2" />
              <CalcButton label="." onClick={inputDecimal} />
              <CalcButton label="=" onClick={handleEquals} variant="equals" />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function CalcButton({
  label,
  onClick,
  variant = "digit",
  active = false,
  className,
}: {
  label: string;
  onClick: () => void;
  variant?: "digit" | "function" | "operator" | "equals";
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center rounded-lg transition-colors",
        variant === "digit" && "bg-secondary text-secondary-foreground hover:bg-muted",
        variant === "function" && "bg-muted text-muted-foreground hover:bg-secondary",
        variant === "operator" &&
          cn(
            "bg-accent text-accent-foreground hover:opacity-90",
            active && "ring-2 ring-primary",
          ),
        variant === "equals" && "bg-primary text-primary-foreground hover:opacity-90",
        className,
      )}
    >
      {label}
    </button>
  );
}
