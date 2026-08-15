'use client';

import type { PaginationMeta } from '@nursery-os/contracts';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export function PaginationControls({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: meta.totalPages }, (_, index) => index + 1);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={meta.page <= 1}
            onClick={(event) => {
              event.preventDefault();
              if (meta.page > 1) onPageChange(meta.page - 1);
            }}
          />
        </PaginationItem>
        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              isActive={page === meta.page}
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page);
              }}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={meta.page >= meta.totalPages}
            onClick={(event) => {
              event.preventDefault();
              if (meta.page < meta.totalPages) onPageChange(meta.page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
