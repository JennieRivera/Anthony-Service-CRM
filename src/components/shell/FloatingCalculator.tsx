"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator as CalculatorIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Operator = "+" | "-" | "×" | "÷";

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
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("close") : t("open")}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
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
          <div className="fixed right-6 bottom-24 z-50 w-72 rounded-xl border border-border bg-card p-3 shadow-xl">
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
