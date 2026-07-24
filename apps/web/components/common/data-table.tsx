import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyMessage = 'No results found.',
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.header}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              Loading…
            </TableCell>
          </TableRow>
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
