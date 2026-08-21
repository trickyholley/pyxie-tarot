# SPDX-License-Identifier: AGPL-3.0-or-later
import io
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer

from app.schemas.diary_entry import EntryCard
from app.schemas.spread import SpreadPosition
from app.schemas.spread_export import SpreadExportRequest

MARGIN = 0.6 * inch
# Matches the live app's fixed-9:16 canvas (spreadPositions.ts's CANVAS_ASPECT_RATIO) and card geometry
# (BASE_CARD_WIDTH_FRACTION, CARD_ASPECT_RATIO) - not pixel-perfect (the edge-clamp math there isn't
# ported here; generous page margins absorb any minor overhang instead).
CANVAS_ASPECT_RATIO = 9 / 16
CARD_WIDTH_FRACTION = 0.2
CARD_ASPECT_RATIO = 57 / 100
DIAGRAM_MAX_HEIGHT_FRACTION = 0.55
DEFAULT_HEADING_COLOR = colors.HexColor("#333333")
DEFAULT_BORDER_COLOR = colors.lightgrey


def _format_card_name(card: str) -> str:
    """Mirrors the frontend's `formatCardName` (packages/ui/src/lib/formatCardName.ts)."""
    return " ".join(word[:1].upper() + word[1:] for word in card.split("_"))


def _build_styles(font_name: str, accent_color: colors.Color | None) -> dict[str, ParagraphStyle]:
    """One shared `font_name` (the user's registered theme font, or Helvetica) and `accent_color`
    (their theme's accent, or a neutral default) across every style - only the regular weight is ever
    registered for a theme font (see `spread_pdf_fonts.py`), so headings render unbolded in it rather
    than falling back to Helvetica-Bold like `<b>` markup does.
    """
    base = getSampleStyleSheet()
    heading_color = accent_color or DEFAULT_HEADING_COLOR
    return {
        "title": ParagraphStyle(
            "SpreadTitle", parent=base["Title"], fontName=font_name, fontSize=18, spaceAfter=4, textColor=heading_color
        ),
        "subtitle": ParagraphStyle(
            "SpreadSubtitle", parent=base["Normal"], fontName=font_name, textColor=colors.grey, spaceAfter=16
        ),
        "heading": ParagraphStyle(
            "SectionHeading",
            parent=base["Heading2"],
            fontName=font_name,
            spaceBefore=16,
            spaceAfter=8,
            textColor=heading_color,
        ),
        "body": ParagraphStyle("Body", parent=base["BodyText"], fontName=font_name),
        "list": ParagraphStyle("PositionList", parent=base["BodyText"], fontName=font_name, spaceAfter=4),
    }


class _SpreadDiagram(Flowable):
    """Draws the spread layout (cards at their normalized positions, rotated/scaled) to roughly match
    the live app's `SpreadCardsCanvas`, tinted with the user's own `--spread-canvas`/accent theme colors
    when given.
    """

    def __init__(
        self,
        cards: list[EntryCard],
        positions: list[SpreadPosition],
        image_by_card: dict[str, bytes],
        width: float,
        font_name: str,
        canvas_color: colors.Color | None,
        border_color: colors.Color | None,
    ) -> None:
        super().__init__()
        self.cards_by_index = {card.position_index: card for card in cards}
        self.positions = positions
        self.image_by_card = image_by_card
        self.width = width
        self.height = width / CANVAS_ASPECT_RATIO
        self.font_name = font_name
        self.canvas_color = canvas_color
        self.border_color = border_color or DEFAULT_BORDER_COLOR

    def wrap(self, available_width: float, available_height: float) -> tuple[float, float]:
        return self.width, self.height

    def draw(self) -> None:
        pdf = self.canv
        if self.canvas_color:
            pdf.setFillColor(self.canvas_color)
            pdf.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        pdf.setStrokeColor(self.border_color)
        pdf.rect(0, 0, self.width, self.height, fill=0)

        for position in self.positions:
            card = self.cards_by_index.get(position.index)
            center_x = position.x * self.width
            center_y = (1 - position.y) * self.height  # PDF's y-axis runs bottom-up, CSS's top-down
            card_width = CARD_WIDTH_FRACTION * self.width * position.scale
            card_height = card_width / CARD_ASPECT_RATIO

            pdf.saveState()
            pdf.translate(center_x, center_y)
            # CSS `rotate` is clockwise in a y-down frame; negate to match visually in PDF's y-up frame.
            # A reversed card is drawn upside-down (matches the live app - reversal is a 180° rotation, not a mirror).
            pdf.rotate(-position.rotation + (180 if card and card.reversed else 0))

            image_bytes = card and self.image_by_card.get(card.card.value)
            if image_bytes:
                pdf.drawImage(
                    ImageReader(io.BytesIO(image_bytes)),
                    -card_width / 2,
                    -card_height / 2,
                    card_width,
                    card_height,
                    mask="auto",
                    preserveAspectRatio=True,
                )
            else:
                pdf.setFillColor(colors.whitesmoke)
                pdf.rect(-card_width / 2, -card_height / 2, card_width, card_height, fill=1, stroke=1)
                if card:
                    pdf.setFillColor(colors.black)
                    pdf.setFont(self.font_name, 6)
                    pdf.drawCentredString(0, 0, _format_card_name(card.card.value))
            pdf.restoreState()


def _position_list_paragraphs(
    cards: list[EntryCard], positions: list[SpreadPosition], style: ParagraphStyle
) -> list[Paragraph]:
    cards_by_index = {card.position_index: card for card in cards}
    paragraphs = []
    for position in sorted(positions, key=lambda p: p.index):
        card = cards_by_index.get(position.index)
        card_text = _format_card_name(card.card.value) + (" (reversed)" if card.reversed else "") if card else "—"
        label = xml_escape(position.label)
        paragraphs.append(Paragraph(f"<b>{position.index + 1}. {label}:</b> {xml_escape(card_text)}", style))
    return paragraphs


def build_spread_pdf(
    payload: SpreadExportRequest,
    image_by_card: dict[str, bytes],
    font_name: str = "Helvetica",
) -> bytes:
    """Renders a spread (+ optional reflection) to a PDF, returned as bytes. Structural markup (`<b>`,
    `<br/>`) is only ever written by this function itself - every user-authored string (spread/position
    names, entry text, prompts/replies - custom spreads make even labels/prompts user-controlled) is
    `xml_escape`d before reaching a `Paragraph`, since ReportLab's paragraph markup parser supports an
    `<img src="...">` tag that would otherwise turn unescaped user text into a local-file-read/SSRF
    vector. Text is drawn as real PDF text objects, so it stays selectable - ReportLab's built-in
    base-14 fonts need no bundled font files, and `font_name` (from `register_theme_font`) is
    pre-registered by the caller either way.
    """
    accent_color = colors.HexColor(payload.accent_color) if payload.accent_color else None
    canvas_color = colors.HexColor(payload.canvas_color) if payload.canvas_color else None
    styles = _build_styles(font_name, accent_color)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN
    )

    max_diagram_height = doc.height * DIAGRAM_MAX_HEIGHT_FRACTION
    diagram_width = min(doc.width, max_diagram_height * CANVAS_ASPECT_RATIO)

    story: list[Flowable] = [
        Paragraph(xml_escape(payload.spread_name), styles["title"]),
        Paragraph(payload.entry_date.isoformat(), styles["subtitle"]),
        _SpreadDiagram(
            payload.cards, payload.positions, image_by_card, diagram_width, font_name, canvas_color, accent_color
        ),
        Spacer(1, 16),
        *_position_list_paragraphs(payload.cards, payload.positions, styles["list"]),
    ]

    if payload.entry_text or payload.prompts:
        story.append(Paragraph("Reflection", styles["heading"]))
        if payload.entry_text:
            story.append(Paragraph(xml_escape(payload.entry_text).replace("\n", "<br/>"), styles["body"]))
        for prompt in payload.prompts:
            story.append(Spacer(1, 8))
            story.append(Paragraph(f"<i>{xml_escape(prompt.prompt)}</i>", styles["body"]))
            story.append(Paragraph(xml_escape(prompt.reply) or "—", styles["body"]))

    doc.build(story)
    return buffer.getvalue()
