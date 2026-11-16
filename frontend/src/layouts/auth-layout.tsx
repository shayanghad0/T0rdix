import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Animated floating path field from the ui-master prompt (auth hero backdrop). */
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 24 }, (_, index) => ({
    id: index,
    d: `M-${380 - index * 5 * position} -${189 + index * 6}C-${
      380 - index * 5 * position
    } -${189 + index * 6} -${312 - index * 5 * position} ${216 - index * 6} ${
      152 - index * 5 * position
    } ${343 - index * 6}C${616 - index * 5 * position} ${470 - index * 6} ${
      684 - index * 5 * position
    } ${875 - index * 6} ${684 - index * 5 * position} ${875 - index * 6}`,
    width: 0.5 + index * 0.04,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="h-full w-full text-primary/40" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.5 }}
            animate={{ pathLength: 1, opacity: [0.25, 0.55, 0.25], pathOffset: [0, 1, 0] }}
            transition={{ duration: 18 + Math.random() * 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        ))}
      </svg>
    </div>
  );
}

/** Split hero layout used by /login and /register. */
export function AuthLayout({ children, headline }: { children: ReactNode; headline: string }) {
  const words = headline.split(" ");
  let letterDelay = 0;

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-2 md:items-center md:px-8">
        <div className="hidden md:block">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-mono text-base font-bold text-white shadow-glow">
              T
            </div>
            <span className="font-mono text-lg font-bold tracking-tight text-content">T0rdix</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tighter">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="mr-4 inline-block last:mr-0">
                {word.split("").map((letter, letterIndex) => {
                  letterDelay += 0.012;
                  return (
                    <motion.span
                      key={`${wordIndex}-${letterIndex}`}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: letterDelay, type: "spring", stiffness: 150, damping: 24 }}
                      className="inline-block bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
                    >
                      {letter}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Secrets, mock APIs, REST testing, OpenAPI tooling and fake data — one local-first
            workspace for shipping software faster.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Secret Vault", "Mock Studio", "API Client", "OpenAPI"].map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-line/70 bg-surface/50 px-3 py-1 text-[11px] text-muted backdrop-blur"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="group relative rounded-2xl bg-gradient-to-b from-white/10 to-black/10 p-px backdrop-blur-lg">
          <div className="rounded-2xl border border-line/70 bg-surface/85 p-7 shadow-card backdrop-blur-2xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
