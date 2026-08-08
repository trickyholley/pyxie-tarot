// SPDX-License-Identifier: AGPL-3.0-or-later
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export default function TablePagination({ page, totalPages, loading, onPageChange }: TablePaginationProps) {
  const { t } = useTranslation("common");
  return (
    <Pagination className="mt-4 justify-start">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text={t("pagination.previous")}
            aria-disabled={loading || page <= 1}
            className={loading || page <= 1 ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(Math.max(1, page - 1));
            }}
          />
        </PaginationItem>
        <PaginationItem className="flex items-center px-2 text-sm text-muted-foreground">
          {t("pagination.pageOf", { page, totalPages })}
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            text={t("pagination.next")}
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
