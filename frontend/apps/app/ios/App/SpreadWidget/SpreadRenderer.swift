// SPDX-License-Identifier: AGPL-3.0-or-later
import SwiftUI

// Fixed canvas, matching SpreadBitmapRenderer.kt - the widget scales the rendered image to fit.
private let canvasSize = CGSize(width: 280, height: 480)
private let renderScale = 2.0
private let canvasBackground = Color(hex: 0xF6EEF3)

private struct PlacedCard {
    let position: SpreadPosition
    let image: UIImage
    let reversed: Bool
}

/// PNG of [entry] matching the in-app canvas: its photo if it has one, else its cards drawn from the system deck.
func renderEntry(_ entry: DiaryEntry, api: SpreadAPI) async throws -> Data {
    if let photoURL = entry.imageUrl.flatMap(resolveImageURL) {
        let photo = await loadImage(photoURL, maxPixelSize: Int(canvasSize.height * renderScale * 2))
        return await render(photoCanvas(photo))
    }

    let images = try await api.systemDeckImages()
    let cardByPosition = Dictionary(uniqueKeysWithValues: entry.cards.map { ($0.positionIndex, $0) })
    var placed: [PlacedCard] = []
    for position in displayPositions(spreadName: entry.spreadName, entry.positions) {
        guard let card = cardByPosition[position.index], let url = images[card.card],
              let image = await loadImage(url, maxPixelSize: Int(canvasSize.height * renderScale))
        else { continue }
        placed.append(PlacedCard(position: position, image: image, reversed: card.reversed))
    }
    return await render(spreadCanvas(placed))
}

@MainActor
private func render(_ content: some View) -> Data {
    let canvas = content
        .frame(width: canvasSize.width, height: canvasSize.height)
        .background(canvasBackground)
        .overlay(alignment: .bottomTrailing) {
            Image("Logo").resizable().frame(width: 80, height: 80).opacity(0.75).padding(14)
        }
    let renderer = ImageRenderer(content: canvas)
    renderer.scale = renderScale
    return renderer.uiImage!.pngData()!
}

/// Mirrors PhotoSpreadCanvas.tsx's `object-cover`.
private func photoCanvas(_ photo: UIImage?) -> some View {
    photo.map { Image(uiImage: $0).resizable().scaledToFill().frame(width: canvasSize.width, height: canvasSize.height).clipped() }
}

private func spreadCanvas(_ cards: [PlacedCard]) -> some View {
    ZStack {
        ForEach(cards.indices, id: \.self) { i in
            let card = cards[i]
            let width = baseCardWidthFraction * card.position.scale * canvasSize.width
            let center = card.position.renderCenter
            Image(uiImage: card.image)
                .resizable()
                .scaledToFit()
                .frame(width: width, height: width / aspectRatio)
                .rotationEffect(.degrees(card.position.rotation + (card.reversed ? 180 : 0)))
                .position(x: center.x * canvasSize.width, y: center.y * canvasSize.height)
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double(hex >> 16 & 0xFF) / 255, green: Double(hex >> 8 & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}
