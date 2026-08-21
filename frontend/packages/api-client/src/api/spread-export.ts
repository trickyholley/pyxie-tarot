// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { SpreadExportPayload } from "@api-client/models";
import { postBlob } from "@api-client/utils.ts";

/** Renders a spread (+ optional reflection) to PDF; returns the file as a `Blob` rather than JSON. */
export function exportSpreadPdf(payload: SpreadExportPayload): Promise<Blob> {
  return postBlob(`${API.BASE_URL}/spread-export/pdf`, payload);
}
