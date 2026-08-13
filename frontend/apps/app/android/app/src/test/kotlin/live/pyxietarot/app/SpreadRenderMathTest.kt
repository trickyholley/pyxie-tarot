// SPDX-License-Identifier: AGPL-3.0-or-later
package live.pyxietarot.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

// Parity tests against frontend/packages/ui/src/lib/spreadPositions.test.ts's cases, so the two
// implementations stay provably in sync.
class SpreadRenderMathTest {
    @Test
    fun `cardHalfExtents matches BASE_CARD_WIDTH_FRACTION for an unrotated card`() {
        val extents = cardHalfExtents(0f, 1f)
        assertEquals(BASE_CARD_WIDTH_FRACTION / 2, extents.halfWidthFraction, 0.0001f)
    }

    @Test
    fun `cardHalfExtents grows in both dimensions for a diagonally rotated card`() {
        val unrotated = cardHalfExtents(0f, 1f)
        val rotated45 = cardHalfExtents(45f, 1f)
        assertTrue(rotated45.halfWidthFraction > unrotated.halfWidthFraction)
        assertTrue(rotated45.halfHeightFraction > unrotated.halfHeightFraction)
    }

    @Test
    fun `cardHalfExtents widens a card rotated 90 degrees since it now lies on its side`() {
        val unrotated = cardHalfExtents(0f, 1f)
        val rotated90 = cardHalfExtents(90f, 1f)
        assertTrue(rotated90.halfWidthFraction > unrotated.halfWidthFraction)
    }

    @Test
    fun `cardHalfExtents treats a half-turn as equivalent to no rotation`() {
        val halfTurn = cardHalfExtents(180f, 1.5f)
        val noRotation = cardHalfExtents(0f, 1.5f)
        assertEquals(noRotation.halfWidthFraction, halfTurn.halfWidthFraction, 0.0001f)
        assertEquals(noRotation.halfHeightFraction, halfTurn.halfHeightFraction, 0.0001f)
    }

    @Test
    fun `clampToCanvas leaves a value untouched when it's already clear of the edges`() {
        assertEquals(0.5f, clampToCanvas(0.5f, 0.2f), 0.0001f)
    }

    @Test
    fun `clampToCanvas clamps up to halfExtent when too close to the start edge`() {
        assertEquals(0.2f, clampToCanvas(0.05f, 0.2f), 0.0001f)
    }

    @Test
    fun `clampToCanvas clamps down to 1 minus halfExtent when too close to the end edge`() {
        assertEquals(0.8f, clampToCanvas(0.95f, 0.2f), 0.0001f)
    }

    @Test
    fun `renderCenter returns the position's own x-y when its footprint already fits`() {
        val center = renderCenter(0.5f, 0.5f, 0f, 1f)
        assertEquals(0.5f, center.x, 0.0001f)
        assertEquals(0.5f, center.y, 0.0001f)
    }

    // Regression case: a card like Celtic Cross's "Challenge" position (rotation: 90) sitting well
    // away from any edge could still have its rotated footprint clipped at a high enough scale, since
    // rotation swaps its width/height needs - renderCenter must nudge it inward to compensate.
    @Test
    fun `renderCenter nudges a rotated card inward when its rotated footprint would otherwise clip an edge`() {
        val center = renderCenter(0.35f, 0.55f, 90f, 2f)
        assertTrue(center.x > 0.35f)
    }
}
