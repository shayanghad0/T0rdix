import Editor, { type OnMount } from "@monaco-editor/react";
import { cn } from "@/lib/utils";

/**
 * Monaco wrapper for JSON / env / response editing.
 * `@monaco-editor/react` lazy-loads the engine itself, keeping first paint fast.
 */
export interface CodeEditorProps {
  value: string;
  language?: "json" | "shell" | "plaintext";
  readOnly?: boolean;
  height?: number | string;
  className?: string;
  onChange?: (value: string | undefined) => void;
}

export function CodeEditor({
  value,
  language = "json",
  readOnly = true,
  height = 260,
  className,
  onChange,
}: CodeEditorProps) {
  const onMount: OnMount = (editor) => {
    editor.onKeyDown((event) => {
      // Allow Escape to bubble so modals stay closable while editing.
      if (event.browserEvent.key === "Escape") event.browserEvent.stopPropagation();
    });
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-line/70", className)} style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        theme="vs-dark"
        onMount={onMount}
        onChange={onChange}
        loading={
          <div className="flex h-full items-center justify-center bg-surface-2/40 font-mono text-xs text-faint">
            loading editor…
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          scrollBeyondLastLine: false,
          renderLineHighlight: "none",
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
          tabSize: 2,
          lineNumbersMinChars: 3,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          overviewRulerBorder: false,
        }}
      />
    </div>
  );
}
