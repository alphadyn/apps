import AppKit

let output = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let navy = NSColor(srgbRed: 16 / 255, green: 36 / 255, blue: 59 / 255, alpha: 1)
let gold = NSColor(srgbRed: 222 / 255, green: 190 / 255, blue: 126 / 255, alpha: 1)
let muted = NSColor(srgbRed: 187 / 255, green: 202 / 255, blue: 219 / 255, alpha: 1)

let vectorMark = """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#10243b"/>
  <g fill="none" stroke="#debe7e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 8l23 8v19c0 10-10 17-23 22C19 52 9 45 9 35V16z"/>
    <path d="M32 18v28M24 46h16M18 25h28M21 25l-6 12h12zM43 25l-6 12h12z"/>
  </g>
  <circle cx="32" cy="18" r="2.5" fill="#debe7e"/>
</svg>
"""

func text(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat, color: NSColor, bold: Bool = false) {
    (value as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [
        .font: NSFont.systemFont(ofSize: size, weight: bold ? .bold : .regular),
        .foregroundColor: color
    ])
}

func emblem(x: CGFloat, y: CGFloat, size: CGFloat) {
    NSGraphicsContext.saveGraphicsState()
    let transform = NSAffineTransform()
    transform.translateX(by: x, yBy: y)
    transform.scale(by: size / 64)
    transform.concat()
    navy.setFill()
    NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: 64, height: 64), xRadius: 14, yRadius: 14).fill()
    gold.setStroke()
    let lines = NSBezierPath()
    lines.lineWidth = 2.5
    lines.lineCapStyle = .round
    lines.lineJoinStyle = .round
    for points in [
        [NSPoint(x: 32, y: 46), NSPoint(x: 32, y: 18)],
        [NSPoint(x: 24, y: 18), NSPoint(x: 40, y: 18)],
        [NSPoint(x: 18, y: 39), NSPoint(x: 46, y: 39)],
        [NSPoint(x: 21, y: 39), NSPoint(x: 15, y: 27), NSPoint(x: 27, y: 27), NSPoint(x: 21, y: 39)],
        [NSPoint(x: 43, y: 39), NSPoint(x: 37, y: 27), NSPoint(x: 49, y: 27), NSPoint(x: 43, y: 39)]
    ] {
        lines.move(to: points[0])
        for point in points.dropFirst() { lines.line(to: point) }
    }
    lines.stroke()
    let shield = NSBezierPath()
    shield.lineWidth = 2.5
    shield.lineJoinStyle = .round
    shield.move(to: NSPoint(x: 32, y: 56))
    shield.line(to: NSPoint(x: 55, y: 48))
    shield.line(to: NSPoint(x: 55, y: 29))
    shield.curve(to: NSPoint(x: 32, y: 7), controlPoint1: NSPoint(x: 55, y: 19), controlPoint2: NSPoint(x: 45, y: 12))
    shield.curve(to: NSPoint(x: 9, y: 29), controlPoint1: NSPoint(x: 19, y: 12), controlPoint2: NSPoint(x: 9, y: 19))
    shield.line(to: NSPoint(x: 9, y: 48))
    shield.close()
    shield.stroke()
    gold.setFill()
    NSBezierPath(ovalIn: NSRect(x: 29.5, y: 43.5, width: 5, height: 5)).fill()
    NSGraphicsContext.restoreGraphicsState()
}

func png(_ name: String, width: Int, height: Int, draw: () -> Void) throws {
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
                                      bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                                      isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
          let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        throw NSError(domain: "BrandAssets", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot create image context"])
    }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    draw()
    NSGraphicsContext.restoreGraphicsState()
    guard let data = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "BrandAssets", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot encode PNG"])
    }
    try data.write(to: output.appendingPathComponent(name))
    print("Generated \(name) (\(width)x\(height))")
}

for name in ["logo.svg", "favicon.svg"] {
    try (vectorMark + "\n").write(to: output.appendingPathComponent(name), atomically: true, encoding: .utf8)
    print("Generated \(name)")
}
try png("favicon.png", width: 64, height: 64) {
    emblem(x: 0, y: 0, size: 64)
}
try png("apple-touch-icon.png", width: 180, height: 180) {
    navy.setFill()
    NSRect(x: 0, y: 0, width: 180, height: 180).fill()
    emblem(x: 10, y: 10, size: 160)
}
try png("social-preview.png", width: 1200, height: 630) {
    navy.setFill()
    NSRect(x: 0, y: 0, width: 1200, height: 630).fill()
    gold.setFill()
    NSRect(x: 64, y: 546, width: 72, height: 3).fill()
    text("LEXHAVEN", x: 64, y: 445, size: 56, color: .white, bold: true)
    text("LEGAL DOCKETING", x: 68, y: 398, size: 22, color: gold, bold: true)
    text("Clear priorities.", x: 64, y: 283, size: 46, color: .white, bold: true)
    text("Confident next steps.", x: 64, y: 225, size: 46, color: .white, bold: true)
    text("Matters  /  Hearings  /  Tasks", x: 68, y: 159, size: 25, color: muted)
    text("alphadyn.github.io/apps/lexhaven-legal-docketing", x: 68, y: 64, size: 19, color: muted)
    emblem(x: 842, y: 225, size: 280)
}
