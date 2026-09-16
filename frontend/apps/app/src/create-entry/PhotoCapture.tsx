// SPDX-License-Identifier: AGPL-3.0-or-later
import { Camera } from "@capacitor/camera";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, toast } from "@pyxie/ui";
import { ArrowLeft, Camera as CameraIcon, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PhotoCaptureProps {
  onCaptured: (photo: Blob) => void;
  onCancel: () => void;
}

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

/** Downscales/recompresses a captured photo via an offscreen canvas before it ever leaves the device -
 * phone cameras routinely produce 10+ MB originals, and the backend re-processes anyway, so there's no
 * reason to upload more than a reasonably-sized JPEG.
 *
 * `imageOrientation: "from-image"` is required here, not optional - `createImageBitmap` otherwise
 * ignores a source photo's EXIF rotation tag, and `canvas.toBlob`'s output carries no EXIF at all, so a
 * sideways photo would come out sideways with nothing left for the backend's own EXIF correction to fix.
 */
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
 * client-side, then hand the finished Blob up - nothing is uploaded here, the parent flow uploads it
 * together with the finished reading once every card has a pin (see this issue's plan doc for why). */
export default function PhotoCapture({ onCaptured, onCancel }: PhotoCaptureProps) {
  const { t } = useTranslation("createEntry");
  const { withLoading } = useLoading();

  const capture = async (source: () => Promise<{ webPath?: string }>) => {
    let result: { webPath?: string };
    try {
      result = await source();
    } catch (err) {
      // The user backing out of the camera/gallery picker rejects the same way a real failure
      // does - Capacitor's own message for it contains "cancel", nothing more specific to check.
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      toast.error(t("photoCapture.captureError"));
      return;
    }
    if (!result.webPath) {
      toast.error(t("photoCapture.captureError"));
      return;
    }

    try {
      const blob = await withLoading(
        fetch(result.webPath)
          .then((res) => res.blob())
          .then(compress),
      );
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

        <Button type="button" onClick={handleTakePhoto}>
          <CameraIcon data-icon="inline-start" />
          {t("photoCapture.takePhoto")}
        </Button>

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
