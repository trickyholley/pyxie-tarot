// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation
import ImageIO
import UIKit

// Matches SpreadWidgetWorker.kt's API_BASE_URL - there's no WebView here to inherit it from.
private let apiOrigin = URL(string: "https://api.pyxietarot.live")!
// Matches useCardArt.ts's SYSTEM_DECK_NAME.
private let systemDeckName = "Rider-Waite-Smith"

struct DiaryEntry: Decodable {
    let id: String
    let spreadName: String
    let positions: [SpreadPosition]
    let cards: [EntryCard]
    let imageUrl: String?
}

struct EntryCard: Decodable {
    let card: String
    let positionIndex: Int
    let reversed: Bool
}

private struct Page<Item: Decodable>: Decodable {
    let items: [Item]
}

private struct Deck: Decodable {
    let id: String
    let name: String
}

private struct DeckCard: Decodable {
    let card: String
    let imageUrl: String?
}

/// The mirrored token went stale past its short TTL - the next login/app-open/new-entry trigger re-syncs it.
struct UnauthorizedError: Error {}

private let decoder = {
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return decoder
}()

private struct DeckImageCache: Codable {
    let savedAt: Date
    let images: [String: URL]
}

private let deckImageCacheTTL: TimeInterval = 24 * 60 * 60

/// Persists systemDeckImages() across timeline refreshes - the system deck's art almost never changes, so
/// re-fetching all decks plus 78 card URLs on every refresh just spends the widget's tight execution budget.
/// Mirrors EntryCache's App-Group-file pattern in SpreadWidget.swift.
private enum DeckImageStore {
    private static let url = FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: WidgetStore.appGroup)?
        .appendingPathComponent("widget_deck_images.json")

    static func load() -> [String: URL]? {
        guard let url, let data = try? Data(contentsOf: url),
              let cache = try? JSONDecoder().decode(DeckImageCache.self, from: data),
              Date.now.timeIntervalSince(cache.savedAt) < deckImageCacheTTL
        else { return nil }
        return cache.images
    }

    static func save(_ images: [String: URL]) {
        guard let url else { return }
        try? JSONEncoder().encode(DeckImageCache(savedAt: .now, images: images)).write(to: url)
    }
}

struct SpreadAPI {
    let token: String

    func todayEntry() async throws -> DiaryEntry? {
        let today = Date.now.formatted(Date.ISO8601FormatStyle(timeZone: .current).year().month().day())
        return try await get(Page<DiaryEntry>.self, "diary-entries?entry_date_from=\(today)&entry_date_to=\(today)")
            .items.first
    }

    /// Card slug -> image URL, for the system deck. Cached for a day (see DeckImageStore).
    func systemDeckImages() async throws -> [String: URL] {
        if let cached = DeckImageStore.load() { return cached }
        guard let deck = try await get([Deck].self, "decks").first(where: { $0.name == systemDeckName }) else {
            return [:]
        }
        let cards = try await get([DeckCard].self, "decks/\(deck.id)/cards")
        let images = cards.reduce(into: [:]) { images, card in images[card.card] = card.imageUrl.flatMap(resolveImageURL) }
        DeckImageStore.save(images)
        return images
    }

    private func get<T: Decodable>(_ type: T.Type, _ path: String) async throws -> T {
        var request = URLRequest(url: URL(string: "/api/v1/\(path)", relativeTo: apiOrigin)!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        switch (response as! HTTPURLResponse).statusCode {
        case 200: return try decoder.decode(type, from: data)
        case 401: throw UnauthorizedError()
        default: throw URLError(.badServerResponse)
        }
    }
}

/// Resolves a possibly-relative image URL against the API origin, rejecting non-http(s) schemes - mirrors
/// frontend/packages/ui/src/lib/imageUrl.ts's getSafeImageUrl.
func resolveImageURL(_ raw: String) -> URL? {
    URL(string: raw, relativeTo: apiOrigin).map(\.absoluteURL).flatMap { ["http", "https"].contains($0.scheme) ? $0 : nil }
}

/// Best-effort (nil on failure, like useCardArt.ts's "names still render without art"), and decoded straight to
/// at most [maxPixelSize] - a full-size photo would blow the widget extension's memory limit.
func loadImage(_ url: URL, maxPixelSize: Int) async -> UIImage? {
    guard let (data, _) = try? await URLSession.shared.data(from: url),
          let source = CGImageSourceCreateWithData(data as CFData, nil)
    else { return nil }
    let options = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixelSize,
    ] as CFDictionary
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options).map(UIImage.init(cgImage:))
}
