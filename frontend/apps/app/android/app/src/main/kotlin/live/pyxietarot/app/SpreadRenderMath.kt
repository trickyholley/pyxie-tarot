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

// Card and canvas share one width/height ratio. Must match spreadPositions.ts's ASPECT_RATIO
// (CANVAS_WIDTH / CANVAS_HEIGHT, i.e. 70/120) - they were separate here (57:100 card on a 9:16 canvas)
// until the web merged them, which left the widget drawing slightly differently shaped cards.
const val ASPECT_RATIO = 7f / 12f

data class HalfExtents(val halfWidthFraction: Float, val halfHeightFraction: Float)

/** Half-width/half-height of a rotated card's on-screen bounding box, as fractions of canvas
 * width/height - bigger than the card's own unrotated size (most noticeably near 45°/135°). Mirrors
 * spreadPositions.ts's cardHalfExtents. */
fun cardHalfExtents(rotationDegrees: Float, scale: Float): HalfExtents {
    val radians = Math.toRadians(rotationDegrees.toDouble())
    val cardWidth = BASE_CARD_WIDTH_FRACTION * scale
    val cardHeight = cardWidth / ASPECT_RATIO
    val bboxWidth = abs(cardWidth * cos(radians)) + abs(cardHeight * sin(radians))
    val bboxHeight = abs(cardWidth * sin(radians)) + abs(cardHeight * cos(radians))
    return HalfExtents(
        halfWidthFraction = (bboxWidth / 2).toFloat(),
        // cardWidth/cardHeight are both fractions of canvas width - converts the height component back
        // to a fraction of canvas height so it's comparable to a position's y.
        halfHeightFraction = (bboxHeight / 2 * ASPECT_RATIO).toFloat(),
    )
}

// The seeded "Single Card" system spread (same name in every environment - system spreads come from
// an Alembic migration, not a per-env seed script). Mirrors spreadPositions.ts's SOLO_SPREAD_NAME -
// the widget only ever renders a saved diary entry's snapshot, which carries spread_name but no
// spread_id, so it matches by name too (see that constant's doc for the degrade-on-rename tradeoff).
const val SOLO_SPREAD_NAME = "Single Card"

// Mirrors spreadPositions.ts's SOLO_SPREAD_DISPLAY_SCALE - a replacement for the saved scale, not a
// multiplier on it (see that constant for why compounding was wrong).
const val SOLO_SPREAD_DISPLAY_SCALE = 4f

/** Clamps a fractional coordinate so a card of the given half-extent stays on-canvas. Mirrors
 * spreadPositions.ts's clampToCanvas - a halfExtent at or past 0.5 (reachable via
 * SOLO_SPREAD_DISPLAY_SCALE's boost) centers the card instead of degenerating to whatever the
 * ordinary min/max formula would pin it to. */
fun clampToCanvas(fraction: Float, halfExtent: Float): Float =
    if (halfExtent >= 0.5f) 0.5f else (1 - halfExtent).coerceAtMost(fraction.coerceAtLeast(halfExtent))

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

/** Positions resized to SOLO_SPREAD_DISPLAY_SCALE when [spreadName] matches SOLO_SPREAD_NAME.
 * Mirrors spreadPositions.ts's getDisplayPositions. */
fun applySoloSpreadBoost(spreadName: String, positions: List<SpreadRenderPosition>): List<SpreadRenderPosition> {
    if (spreadName != SOLO_SPREAD_NAME) return positions
    return positions.map { position ->
        val scale = SOLO_SPREAD_DISPLAY_SCALE
        val center = renderCenter(position.x, position.y, position.rotation, scale)
        position.copy(x = center.x, y = center.y, scale = scale)
    }
}
