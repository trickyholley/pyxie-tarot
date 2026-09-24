// SPDX-License-Identifier: AGPL-3.0-or-later
import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, toast } from "@pyxie/ui";
import { ArrowLeft, Camera as CameraIcon, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { readPhoto } from "@/lib/nativePhoto.ts";

interface PhotoCaptureProps {
  onCaptured: (photo: Blob) => void;
  onCancel: () => void;
}

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

/** Downscales/recompresses a captured photo before upload. `imageOrientation: "from-image"` is required,
 * not optional - `createImageBitmap` otherwise ignores EXIF rotation, and `canvas.toBlob`'s output
 * carries no EXIF at all, so a sideways photo would stay sideways with nothing left to correct it. */
async function compress(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result ?? blob), "image/jpeg", JPEG_QUALITY);
  });
}

/** The photo-canvas flow's first step: take a new photo or pick one from the gallery, compress it
 * client-side, then hand the finished Blob up - nothing is uploaded here yet. */
export default function PhotoCapture({ onCaptured, onCancel }: PhotoCaptureProps) {
  const { t } = useTranslation("createEntry");
  const { withLoading } = useLoading();

  const capture = async (source: () => Promise<{ uri?: string; webPath?: string }>) => {
    let result: { uri?: string; webPath?: string };
    try {
      result = await source();
    } catch (err) {
      // A cancelled picker rejects the same way a real failure does - Capacitor's message for it
      // contains "cancel", nothing more specific to check.
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      toast.error(t("photoCapture.captureError"));
      return;
    }
    if (!result.webPath) {
      toast.error(t("photoCapture.captureError"));
      return;
    }

    try {
      const blob = await withLoading(readPhoto({ uri: result.uri, webPath: result.webPath }).then(compress));
      onCaptured(blob);
    } catch {
      toast.error(t("photoCapture.captureError"));
    }
  };

  const handleTakePhoto = () => capture(() => Camera.takePhoto({ correctOrientation: true, quality: 90 }));

  const handleChooseFromLibrary = () => capture(async () => (await Camera.chooseFromGallery({})).results[0] ?? {});

  return (
    <Card className="mt-8 w-full max-w-md">
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("photoCapture.instructions")}</p>

        {Capacitor.isNativePlatform() && (
          <Button type="button" onClick={handleTakePhoto}>
            <CameraIcon data-icon="inline-start" />
            {t("photoCapture.takePhoto")}
          </Button>
        )}

        <Button type="button" variant="outline" onClick={handleChooseFromLibrary}>
          <ImagePlus data-icon="inline-start" />
          {t("photoCapture.chooseFromLibrary")}
        </Button>

        <Button type="button" variant="link" onClick={onCancel}>
          <ArrowLeft data-icon="inline-start" />
          {t("photoCapture.back")}
        </Button>
      </CardContent>
    </Card>
  );
}
