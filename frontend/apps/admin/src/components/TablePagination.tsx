import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@pyxie/ui";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export default function TablePagination({ page, totalPages, loading, onPageChange }: TablePaginationProps) {
  return (
    <Pagination className="mt-4 justify-start">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={loading || page <= 1}
            className={loading || page <= 1 ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(Math.max(1, page - 1));
            }}
          />
        </PaginationItem>
        <PaginationItem className="flex items-center px-2 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={loading || page >= totalPages}
            className={loading || page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(Math.min(totalPages, page + 1));
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
