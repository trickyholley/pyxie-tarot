// SPDX-License-Identifier: AGPL-3.0-or-later
import CoreGraphics
import Foundation

// Port of frontend/packages/ui/src/lib/spreadPositions.ts's render-center math (as SpreadRenderMath.kt is
// for Android), so the widget matches the in-app SpreadCardsCanvas layout exactly.

let baseCardWidthFraction = 0.2
let aspectRatio = 7.0 / 12.0
private let soloSpreadName = "Single Card"
private let soloSpreadDisplayScale = 4.0

struct SpreadPosition: Decodable {
    let index: Int
    let x: Double
    let y: Double
    let rotation: Double
    let scale: Double

    /// This position's x/y, nudged inward if rotation/scale would push the card past the canvas edge.
    var renderCenter: CGPoint {
        let radians = rotation * .pi / 180
        let cardWidth = baseCardWidthFraction * scale
        let cardHeight = cardWidth / aspectRatio
        let halfWidth = (cardWidth * abs(cos(radians)) + cardHeight * abs(sin(radians))) / 2
        let halfHeight = (cardWidth * abs(sin(radians)) + cardHeight * abs(cos(radians))) / 2 * aspectRatio
        return CGPoint(x: clampToCanvas(x, halfWidth), y: clampToCanvas(y, halfHeight))
    }
}

private func clampToCanvas(_ coord: Double, _ halfExtent: Double) -> Double {
    halfExtent >= 0.5 ? 0.5 : min(1 - halfExtent, max(halfExtent, coord))
}

/// Mirrors spreadPositions.ts's getDisplayPositions - renderCenter re-clamps the boosted scale on its own.
func displayPositions(spreadName: String, _ positions: [SpreadPosition]) -> [SpreadPosition] {
    guard spreadName == soloSpreadName else { return positions }
    return positions.map {
        SpreadPosition(index: $0.index, x: $0.x, y: $0.y, rotation: $0.rotation, scale: soloSpreadDisplayScale)
    }
}
