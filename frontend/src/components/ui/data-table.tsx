import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

/** Minimal typed data table with hover rows and empty state slot. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-line/70", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line/70 bg-surface-2/50">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-b border-line/40 transition-colors last:border-0 hover:bg-surface-2/60",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-3 align-middle", column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
