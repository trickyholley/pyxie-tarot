// SPDX-License-Identifier: AGPL-3.0-or-later
import { Spread, errorMessage, spreadsAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, toast } from "@pyxie/ui";
import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeleteSpreadDialog from "@/components/DeleteSpreadDialog.tsx";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute, spreadEditPath } from "@/lib/routes.ts";
import { useAsyncData } from "@/lib/useAsyncData.ts";

/** Lists the signed-in user's own custom spreads - `listSpreads()` also returns system spreads
 * (user_id: null), which aren't editable/deletable here so are filtered out. */
export default function SpreadsSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("spreads.title"), backTo: AppRoute.Settings, icon: LayoutTemplate });
  const navigate = useNavigate();
  const { withLoading } = useLoading();

  const fetchOwnSpreads = useCallback(
    () => spreadsAPI.listSpreads().then((result) => result.filter((spread) => spread.user_id !== null)),
    [],
  );
  const { data: spreads, setData: setSpreads, error } = useAsyncData(fetchOwnSpreads, t("spreads.list.loadError"));
  const [pendingDelete, setPendingDelete] = useState<Spread | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await withLoading(spreadsAPI.deleteSpread(pendingDelete.id));
      setSpreads((prev) => prev?.filter((spread) => spread.id !== pendingDelete.id) ?? null);
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, t("spreads.list.deleteError")));
    } finally {
      setDeleting(false);
    }
  };

  if (spreads === null) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          <Button type="button" onClick={() => navigate(AppRoute.SpreadsCreate)}>
            <Plus />
            {t("spreads.list.createButton")}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && spreads.length === 0 && <p className="text-sm text-muted-foreground">{t("spreads.list.empty")}</p>}

          {spreads.map((spread) => (
            <div key={spread.id} className="flex items-center gap-2 rounded-md border p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{spread.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("spreads.list.cardCountTemplate", { count: spread.num_cards })}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label={t("spreads.list.editAria", { name: spread.name })}
                onClick={() => navigate(spreadEditPath(spread.id))}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("spreads.list.deleteAria", { name: spread.name })}
                onClick={() => setPendingDelete(spread)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <DeleteSpreadDialog
        spread={pendingDelete}
        deleting={deleting}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
