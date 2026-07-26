import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/common/skeleton';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Present + `onSortChange` passed to DataTable => header becomes a clickable sort toggle (design-system.md §5.6 / §13 rule 8). Must match the backend's sortBy field name. */
  sortKey?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyMessage = 'No results found.',
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  loadingRowCount = 5,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
  /** Skeleton row count shown while isLoading, in place of a "Loading…" cell. */
  loadingRowCount?: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const { sortKey } = column;
            return (
              <TableHead key={column.header}>
                {sortKey && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(sortKey)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {column.header}
                    {sortBy === sortKey ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown
                        className="size-3.5 text-muted-foreground/50"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: loadingRowCount }, (_, index) => (
            <TableRow key={`skeleton-${index}`}>
              {columns.map((column) => (
                <TableCell key={column.header}>
                  <Skeleton className="h-4 w-full max-w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.header}>{column.cell(row)}</TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
