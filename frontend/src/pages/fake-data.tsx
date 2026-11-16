import { useState } from "react";
import { Copy, Download, RefreshCw, Sparkles } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { CodeEditor } from "@/components/ui/code-editor";
import type { FakeDataRow } from "@/types";
import { cn } from "@/lib/utils";

const TYPES = [
  { id: "users", label: "Users", hint: "names, emails, phones" },
  { id: "products", label: "Products", hint: "SKUs, prices, stock" },
  { id: "orders", label: "Orders", hint: "items, totals, status" },
  { id: "companies", label: "Companies", hint: "domains, employees" },
  { id: "addresses", label: "Addresses", hint: "geo, streets, zips" },
] as const;

type FakeType = (typeof TYPES)[number]["id"];

/** Reproducible fake data studio (seeded generator, no external services). */
export function FakeDataPage() {
  const [type, setType] = useState<FakeType>("users");
  const [count, setCount] = useState(10);
  const [seed, setSeed] = useState("");
  const [rows, setRows] = useState<FakeDataRow[] | null>(null);
  const [meta, setMeta] = useState<{ seed: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const result = await api.post<{ data: FakeDataRow[]; meta: { seed: string | null } }>("/fake-data", {
        type,
        count,
        seed: seed || undefined,
      });
      setRows(result.data);
      setMeta(result.meta as { seed: string | null });
    } catch (cause) {
      toast.error("Generation failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const json = rows ? JSON.stringify(rows, null, 2) : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Toolbox</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Fake Data Generator</h1>
          <p className="mt-1 text-sm text-muted">Seeded and deterministic — the same seed always yields the same dataset.</p>
        </div>
        <Button onClick={() => void generate()} loading={busy}>
          <Sparkles className="h-4 w-4" /> Generate
        </Button>
      </header>

      <SpotlightCard className="p-5">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((option) => (
            <button
              key={option.id}
              onClick={() => setType(option.id)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-left transition-all",
                type === option.id
                  ? "border-primary/50 bg-primary/12"
                  : "border-line/70 hover:border-line hover:bg-surface-2",
              )}
            >
              <p className={cn("text-sm font-medium", type === option.id ? "text-content" : "text-muted")}>
                {option.label}
              </p>
              <p className="text-[11px] text-faint">{option.hint}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid max-w-xl grid-cols-[100px_1fr] gap-3">
          <Field label="Count">
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(event) => setCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
            />
          </Field>
          <Field label="Seed (optional)" hint='Leave empty for a random seed each run. Try "demo".'>
            <Input placeholder="demo" value={seed} onChange={(event) => setSeed(event.target.value)} />
          </Field>
        </div>
      </SpotlightCard>

      {rows ? (
        <SpotlightCard glow="var(--c-accent)" className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-content">Result</h2>
            <Badge>{rows.length} rows</Badge>
            {meta?.seed ? <Badge variant="accent">seed: {meta.seed}</Badge> : null}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(json);
                toast.success("JSON copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `t0rdix-${type}${seed ? `-${seed}` : ""}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void generate()}>
              <RefreshCw className="h-3.5 w-3.5" /> Reroll
            </Button>
          </div>
          <CodeEditor language="json" height={420} value={json} readOnly />
        </SpotlightCard>
      ) : (
        <SpotlightCard className="flex h-56 items-center justify-center p-6">
          <div className="text-center">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" />
            <p className="text-xs text-faint">Pick a dataset type and hit Generate — output preview lands here.</p>
          </div>
        </SpotlightCard>
      )}
    </div>
  );
}
