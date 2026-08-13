// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

// Port of frontend/packages/ui/src/lib/spreadPositions.ts's render-center math, so the widget's
// composed bitmap matches the in-app SpreadCardsCanvas layout exactly.

// A card's base footprint as a fraction of canvas width (before the scale multiplier) - keeps `scale`
// resolution-independent. Must match spreadPositions.ts's BASE_CARD_WIDTH_FRACTION.
const val BASE_CARD_WIDTH_FRACTION = 0.2f
private const val CARD_ASPECT_RATIO = 57f / 100f // width / height
const val CANVAS_ASPECT_RATIO = 9f / 16f // width / height

data class HalfExtents(val halfWidthFraction: Float, val halfHeightFraction: Float)

/** Half-width/half-height of a rotated card's on-screen bounding box, as fractions of canvas
 * width/height - bigger than the card's own unrotated size (most noticeably near 45°/135°). Mirrors
 * spreadPositions.ts's cardHalfExtents. */
fun cardHalfExtents(rotationDegrees: Float, scale: Float, canvasAspectRatio: Float = CANVAS_ASPECT_RATIO): HalfExtents {
    val radians = Math.toRadians(rotationDegrees.toDouble())
    val cardWidth = BASE_CARD_WIDTH_FRACTION * scale
    val cardHeight = cardWidth / CARD_ASPECT_RATIO
    val bboxWidth = abs(cardWidth * cos(radians)) + abs(cardHeight * sin(radians))
    val bboxHeight = abs(cardWidth * sin(radians)) + abs(cardHeight * cos(radians))
    return HalfExtents(
        halfWidthFraction = (bboxWidth / 2).toFloat(),
        halfHeightFraction = (bboxHeight / 2 * canvasAspectRatio).toFloat(),
    )
}

/** Clamps a fractional coordinate so a card of the given half-extent stays on-canvas. Mirrors
 * spreadPositions.ts's clampToCanvas - chained coerce calls rather than `coerceIn` so a halfExtent
 * over 0.5 (not reachable today, see the TS original) degrades gracefully instead of throwing. */
fun clampToCanvas(fraction: Float, halfExtent: Float): Float = (1 - halfExtent).coerceAtMost(fraction.coerceAtLeast(halfExtent))

data class RenderCenter(val x: Float, val y: Float)

/** A position's render center: its own x/y, nudged inward if rotation/scale would push the card past
 * the canvas edge. Mirrors spreadPositions.ts's renderCenter. */
fun renderCenter(x: Float, y: Float, rotation: Float, scale: Float): RenderCenter {
    val extents = cardHalfExtents(rotation, scale)
    return RenderCenter(
        x = clampToCanvas(x, extents.halfWidthFraction),
        y = clampToCanvas(y, extents.halfHeightFraction),
    )
}
