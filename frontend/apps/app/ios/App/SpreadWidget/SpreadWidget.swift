// SPDX-License-Identifier: AGPL-3.0-or-later
import SwiftUI
import WidgetKit

private let pathLogin = "/login"
private let pathReading = "/reading"
private let retryInterval: TimeInterval = 30 * 60

enum WidgetContent: Codable {
    case message(title: String, subtitle: String)
    case image(Data)
}

private let noEntryTitle = "Today awaits"
private let noEntrySubtitle = "Tap to draw your cards"
private let noEntryContent = WidgetContent.message(title: noEntryTitle, subtitle: noEntrySubtitle)

struct SpreadEntry: TimelineEntry, Codable {
    let date: Date
    let content: WidgetContent
    let targetPath: String

    static func noEntry(at date: Date = .now, targetPath: String = pathReading) -> SpreadEntry {
        SpreadEntry(date: date, content: noEntryContent, targetPath: targetPath)
    }
}

/// Today's last successful refresh, re-shown when a later one fails - mirrors SpreadWidgetProvider.kt's cache.
private enum EntryCache {
    private static let url = FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: WidgetStore.appGroup)?
        .appendingPathComponent("widget_today.json")

    static func today() -> SpreadEntry? {
        guard let url, let data = try? Data(contentsOf: url),
              let entry = try? JSONDecoder().decode(SpreadEntry.self, from: data),
              Calendar.current.isDateInToday(entry.date)
        else { return nil }
        return entry
    }

    static func save(_ entry: SpreadEntry) {
        guard let url else { return }
        try? JSONEncoder().encode(entry).write(to: url)
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SpreadEntry {
        SpreadEntry(date: .now, content: .message(title: "Pyxie Tarot", subtitle: "Reading the cards…"), targetPath: "/")
    }

    func getSnapshot(in context: Context, completion: @escaping (SpreadEntry) -> Void) {
        completion(EntryCache.today() ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SpreadEntry>) -> Void) {
        Task { completion(await timeline()) }
    }

    /// Today's state until local midnight, then the no-entry prompt for the new day.
    private func timeline() async -> Timeline<SpreadEntry> {
        guard let token = WidgetStore.token else {
            return Timeline(entries: [.noEntry(targetPath: pathLogin)], policy: .never)
        }

        let midnight = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: .now))!
        let midnightEntry = SpreadEntry.noEntry(at: midnight)
        do {
            let entry = try await fetchToday(SpreadAPI(token: token))
            EntryCache.save(entry)
            return Timeline(entries: [entry, midnightEntry], policy: .after(midnight))
        } catch {
            let retry = error is UnauthorizedError ? midnight : .now.addingTimeInterval(retryInterval)
            return Timeline(entries: [EntryCache.today() ?? .noEntry(), midnightEntry], policy: .after(retry))
        }
    }

    private func fetchToday(_ api: SpreadAPI) async throws -> SpreadEntry {
        guard let entry = try await api.todayEntry() else { return .noEntry() }
        let image = try await renderEntry(entry, api: api)
        return SpreadEntry(date: .now, content: .image(image), targetPath: "/diary/\(entry.id)")
    }
}

struct SpreadWidgetView: View {
    let entry: SpreadEntry

    var body: some View {
        content
            .widgetURL(WidgetStore.deepLink(to: entry.targetPath))
            .containerBackground(Color(hex: 0xE2D6BE), for: .widget)
    }

    @ViewBuilder private var content: some View {
        render(entry.content)
    }

    /// Falls back to the no-entry message if `data` turns out not to be a decodable image - e.g. a
    /// truncated `EntryCache` write from an interrupted app refresh.
    @ViewBuilder private func render(_ content: WidgetContent) -> some View {
        switch content {
        case let .image(data):
            if let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage).resizable().scaledToFit()
            } else {
                messageView(title: noEntryTitle, subtitle: noEntrySubtitle)
            }
        case let .message(title, subtitle):
            messageView(title: title, subtitle: subtitle)
        }
    }

    @ViewBuilder private func messageView(title: String, subtitle: String) -> some View {
        VStack(spacing: 2) {
            Image("Logo").resizable().frame(width: 40, height: 40).padding(.bottom, 6)
            Text(title).font(.system(size: 15, weight: .bold))
            Text(subtitle).font(.system(size: 11)).opacity(0.7)
        }
        .multilineTextAlignment(.center)
        .foregroundStyle(Color(hex: 0x0A0A0A))
    }
}

struct SpreadWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetStore.kind, provider: Provider()) { SpreadWidgetView(entry: $0) }
            .configurationDisplayName("Daily Spread")
            .description("Today's reading from your diary.")
            .supportedFamilies([.systemSmall, .systemLarge])
    }
}
