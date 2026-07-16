import AppKit

let output = CommandLine.arguments.dropFirst().first ?? "icon.png"
let size = NSSize(width: 256, height: 256)
let image = NSImage(size: size)
image.lockFocus()

NSColor(calibratedRed: 0.035, green: 0.027, blue: 0.024, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(origin: .zero, size: size), xRadius: 48, yRadius: 48).fill()

NSColor(calibratedRed: 0.30, green: 0.045, blue: 0.045, alpha: 1).setFill()
NSColor(calibratedRed: 0.86, green: 0.59, blue: 0.20, alpha: 1).setStroke()
let frame = NSBezierPath(roundedRect: NSRect(x: 18, y: 18, width: 220, height: 220), xRadius: 35, yRadius: 35)
frame.lineWidth = 9
frame.fill()
frame.stroke()

NSColor(calibratedRed: 1, green: 0.88, blue: 0.52, alpha: 1).setFill()
let bulbPoints: [(CGFloat, CGFloat)] = [
    (48, 39), (80, 39), (112, 39), (144, 39), (176, 39), (208, 39),
    (48, 217), (80, 217), (112, 217), (144, 217), (176, 217), (208, 217),
    (39, 72), (39, 104), (39, 136), (39, 168),
    (217, 72), (217, 104), (217, 136), (217, 168),
]
for (x, y) in bulbPoints {
    NSBezierPath(ovalIn: NSRect(x: x - 8, y: y - 8, width: 16, height: 16)).fill()
}

NSColor(calibratedWhite: 0.04, alpha: 1).setFill()
NSColor(calibratedRed: 0.86, green: 0.59, blue: 0.20, alpha: 1).setStroke()
let screen = NSBezierPath(roundedRect: NSRect(x: 66, y: 64, width: 124, height: 128), xRadius: 12, yRadius: 12)
screen.lineWidth = 5
screen.fill()
screen.stroke()

let play = NSBezierPath()
play.move(to: NSPoint(x: 106, y: 94))
play.line(to: NSPoint(x: 106, y: 162))
play.line(to: NSPoint(x: 164, y: 128))
play.close()
NSColor(calibratedRed: 1, green: 0.94, blue: 0.73, alpha: 1).setFill()
play.fill()

image.unlockFocus()
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Unable to render icon")
}
try png.write(to: URL(fileURLWithPath: output))
