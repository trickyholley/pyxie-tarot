// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread } from "@pyxie/api-client";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TruncatedText from "@/components/TruncatedText";

interface SpreadsTableProps {
  spreads: AdminSpread[];
  onEdit: (spread: AdminSpread) => void;
  onDelete: (spread: AdminSpread) => void;
}

export default function SpreadsTable({ spreads, onEdit, onDelete }: SpreadsTableProps) {
  const { t } = useTranslation(["spreads", "common"]);
  return (
    // 65rem caps height at Spreads.tsx's PAGE_SIZE (20 rows * 3.125rem + 2.5rem header); shrinks below
    // that on shorter viewports.
    <div className="h-[min(65rem,calc(100vh-14rem))] overflow-y-auto *:data-[slot=table-container]:overflow-visible">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-2/12">{t("common:name")}</TableHead>
            <TableHead className="w-2/12">{t("common:description")}</TableHead>
            <TableHead className="w-2/12">{t("table.owner")}</TableHead>
            <TableHead className="w-1/12">{t("table.cards")}</TableHead>
            <TableHead className="w-1/12">{t("table.reversed")}</TableHead>
            <TableHead className="w-2/12">{t("common:created")}</TableHead>
            <TableHead className="w-2/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {spreads.map((spread) => (
            <TableRow key={spread.id} className="h-12.5">
              <TableCell>
                <TruncatedText value={spread.name} />
              </TableCell>
              <TableCell>
                <TruncatedText value={spread.description ?? ""} />
              </TableCell>
              <TableCell>
                <TruncatedText value={spread.owner_username ?? t("common:system")} />
              </TableCell>
              <TableCell>{spread.num_cards}</TableCell>
              <TableCell>{spread.allow_reversed ? t("common:yes") : t("common:no")}</TableCell>
              <TableCell>{new Date(spread.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(spread)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDelete(spread)}>
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
