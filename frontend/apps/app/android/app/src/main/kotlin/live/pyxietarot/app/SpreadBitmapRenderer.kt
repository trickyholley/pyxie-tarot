// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import coil3.ImageLoader
import coil3.request.ImageRequest
import coil3.request.SuccessResult
import coil3.request.allowHardware
import coil3.toBitmap

// Fixed target resolution for the composed spread, independent of any widget instance's actual
// on-screen size - RemoteViews' ImageView (fitCenter) scales it to fit whatever size each instance
// is. Keeps this simple (no per-instance recomposition) and keeps the pushed Bitmap payload well
// under RemoteViews' Binder transaction size ceiling.
private const val CANVAS_WIDTH_PX = 270
private const val CANVAS_HEIGHT_PX = 480 // matches CANVAS_ASPECT_RATIO (9:16)
private const val CARD_ASPECT_RATIO = 57f / 100f // width / height, matches SpreadRenderMath's

// Matches the app's spread-canvas background token (frontend's `bg-spread-canvas`).
private val BACKGROUND_COLOR = Color.parseColor("#f6eef3")

data class SpreadRenderPosition(val positionIndex: Int, val x: Float, val y: Float, val rotation: Float, val scale: Float)

data class SpreadRenderCard(val positionIndex: Int, val imageUrl: String, val reversed: Boolean)

/** Composes today's spread into a single bitmap matching the in-app `SpreadCardsCanvas` layout -
 * positions with no matching card, or whose art fails to load, are skipped silently (best-effort,
 * matching `useCardArt.ts`'s philosophy of "names still render without art"). */
suspend fun renderSpread(
    context: Context,
    imageLoader: ImageLoader,
    positions: List<SpreadRenderPosition>,
    cards: List<SpreadRenderCard>,
): Bitmap {
    val bitmap = Bitmap.createBitmap(CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(BACKGROUND_COLOR)

    val cardByPositionIndex = cards.associateBy { it.positionIndex }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    for (position in positions) {
        val card = cardByPositionIndex[position.positionIndex] ?: continue
        val cardBitmap = loadCardBitmap(context, imageLoader, card.imageUrl) ?: continue
        canvas.drawBitmap(cardBitmap, cardMatrix(cardBitmap, position, card.reversed), paint)
    }

    return bitmap
}

private suspend fun loadCardBitmap(context: Context, imageLoader: ImageLoader, url: String): Bitmap? {
    val request = ImageRequest.Builder(context).data(url).allowHardware(false).build()
    return (imageLoader.execute(request) as? SuccessResult)?.image?.toBitmap()
}

/** Maps a card bitmap onto its position: fit (not stretched, mirroring the web's `object-contain`)
 * into a card-sized rect centered at the origin, rotated (position.rotation, plus a further 180° for a
 * reversed card - see SpreadRenderMath.kt's doc), then translated to its render center. */
private fun cardMatrix(cardBitmap: Bitmap, position: SpreadRenderPosition, reversed: Boolean): Matrix {
    val center = renderCenter(position.x, position.y, position.rotation, position.scale)
    val cardWidthPx = BASE_CARD_WIDTH_FRACTION * position.scale * CANVAS_WIDTH_PX
    val cardHeightPx = cardWidthPx / CARD_ASPECT_RATIO

    val matrix = Matrix()
    matrix.setRectToRect(
        RectF(0f, 0f, cardBitmap.width.toFloat(), cardBitmap.height.toFloat()),
        RectF(-cardWidthPx / 2, -cardHeightPx / 2, cardWidthPx / 2, cardHeightPx / 2),
        Matrix.ScaleToFit.CENTER,
    )
    matrix.postRotate(position.rotation + if (reversed) 180f else 0f)
    matrix.postTranslate(center.x * CANVAS_WIDTH_PX, center.y * CANVAS_HEIGHT_PX)
    return matrix
}
