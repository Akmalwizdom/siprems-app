import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id?: string | number; [key: string]: any }> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends { id?: string | number; [key: string]: any }>({
  columns,
  data,
  pageSize = 10,
  isLoading = false,
  emptyMessage = 'No data found',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: '',
    direction: null,
  });

  const sortedAndPaginatedData = useMemo(() => {
    let processedData = [...data];

    if (sortConfig.key && sortConfig.direction) {
      processedData.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string') {
          const compareResult = aVal.localeCompare(bVal);
          return sortConfig.direction === 'asc' ? compareResult : -compareResult;
        }

        if (typeof aVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      sorted: processedData,
      paginated: processedData.slice(startIndex, endIndex),
    };
  }, [data, sortConfig, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAndPaginatedData.sorted.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { key: '', direction: null };
        }
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return null;
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 inline ml-1" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ChevronDown className="w-4 h-4 inline ml-1" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={String(col.key)}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={`${i}-${String(col.key)}`}>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none' : ''}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable && getSortIcon(String(col.key))}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndPaginatedData.paginated.length > 0 ? (
              sortedAndPaginatedData.paginated.map((row, idx) => (
                <TableRow
                  key={row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <TableCell key={`${row.id}-${String(col.key)}`}>
                      {col.render
                        ? col.render(row[String(col.key)], row)
                        : row[String(col.key)]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedAndPaginatedData.sorted.length)} of{' '}
            {sortedAndPaginatedData.sorted.length} results
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isVisible =
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                if (!isVisible && i > 0 && i < totalPages - 1) {
                  if (pageNum === currentPage - 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <span className="text-gray-500">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                }

                if (!isVisible) return null;

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
