"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.64 18.36a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

const transition = { duration: 0.4, type: "spring" as const, bounce: 0.25 };

const arrowVariants = {
  collapsed: { scale: 0, opacity: 0, rotate: -12 },
  expanded: { scale: 1, opacity: 1, rotate: 0 },
};

const MAX_TEXTAREA_HEIGHT = 200;

export function IntakeForm() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dilemma, setDilemma] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "unreachable">("idle");
  const router = useRouter();

  // auto-grow the textarea vertically once wrapped text overflows a single line
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [dilemma, isExpanded]);

  const handleSubmit = useCallback(async () => {
    if (!dilemma.trim() || status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dilemma }),
      });
      if (!res.ok) throw new Error("session creation failed");
      const data = await res.json();
      router.push(`/session/${data.id}`);
    } catch {
      setStatus("unreachable");
    }
  }, [dilemma, status, router]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => setDilemma(e.target.value);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      textareaRef.current?.blur();
      if (!dilemma) setIsExpanded(false);
    }
  };

  const handleBlur = () => {
    if (!dilemma) setIsExpanded(false);
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full max-w-2xl items-end justify-center">
        <motion.div
          initial={false}
          animate={{ width: isExpanded ? "100%" : 340 }}
          transition={transition}
          onClick={() => !isExpanded && setIsExpanded(true)}
          className="flex max-w-full cursor-text items-start gap-3 rounded-[28px] border-2 border-ink bg-card px-5 py-3 shadow-[3px_3px_0_var(--shadow-beige)]"
        >
          <PaperclipIcon className="mt-1 size-5 shrink-0 -rotate-12 text-ink-soft" />
          <textarea
            ref={textareaRef}
            rows={1}
            value={dilemma}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            onBlur={handleBlur}
            placeholder="State your case"
            aria-label="Your dilemma"
            className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 font-sans text-ink outline-none placeholder:text-ink-soft/70"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
        </motion.div>

        <AnimatePresence>
          {dilemma.trim() && (
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={status === "submitting"}
              aria-label="Convene the council"
              variants={arrowVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={transition}
              className="mb-1 ml-2 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-terracotta text-card shadow-[2px_2px_0_var(--shadow-beige)] disabled:opacity-60"
            >
              <ArrowIcon />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {status === "unreachable" && (
        <p className="text-center text-sm text-terracotta">
          Council service isn&apos;t running yet — this is a stub route until the backend is wired up.
        </p>
      )}
    </div>
  );
}
