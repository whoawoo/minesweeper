//
//  ContentView.swift
//  Minesweeper
//

import SwiftUI

// MARK: - Model

enum CellState {
    case hidden
    case revealed
    case flagged
}

struct Cell {
    var isMine: Bool = false
    var state: CellState = .hidden
    var neighbors: Int = 0
}

enum GameStatus {
    case idle
    case playing
    case won
    case lost
}

enum Difficulty: String, CaseIterable, Identifiable, Hashable {
    case beginner, intermediate, expert
    var id: String { rawValue }
    var label: String {
        switch self {
        case .beginner: "초급"
        case .intermediate: "중급"
        case .expert: "고급"
        }
    }
    var subtitle: String {
        switch self {
        case .beginner: "8 × 8 · 지뢰 17"
        case .intermediate: "16 × 16 · 지뢰 54"
        case .expert: "30 × 16 · 지뢰 103"
        }
    }
    // 세로형 폰 화면 기준 — 행이 더 많고 열은 적게. 지뢰 개수는 PWA 그대로.
    var rows: Int { switch self { case .beginner: 8; case .intermediate: 16; case .expert: 30 } }
    var cols: Int { switch self { case .beginner: 8; case .intermediate: 16; case .expert: 16 } }
    var mines: Int { switch self { case .beginner: 17; case .intermediate: 54; case .expert: 103 } }
}

@Observable
final class GameModel {
    let difficulty: Difficulty
    var board: [[Cell]]
    var status: GameStatus = .idle
    var elapsed: Int = 0
    var flagCount: Int = 0  // 매 render마다 board 전체 순회 안 하도록 캐시

    private var minesPlaced = false
    private var timer: Timer?

    var rows: Int { difficulty.rows }
    var cols: Int { difficulty.cols }
    var mineCount: Int { difficulty.mines }
    var minesRemaining: Int { mineCount - flagCount }

    init(difficulty: Difficulty) {
        self.difficulty = difficulty
        self.board = Self.emptyBoard(rows: difficulty.rows, cols: difficulty.cols)
    }

    deinit { timer?.invalidate() }

    static func emptyBoard(rows: Int, cols: Int) -> [[Cell]] {
        Array(repeating: Array(repeating: Cell(), count: cols), count: rows)
    }

    func newGame() {
        board = Self.emptyBoard(rows: rows, cols: cols)
        status = .idle
        elapsed = 0
        flagCount = 0
        minesPlaced = false
        stopTimer()
    }

    func reveal(_ r: Int, _ c: Int) {
        guard status == .idle || status == .playing else { return }
        guard board[r][c].state == .hidden else { return }

        if !minesPlaced {
            placeMines(safe: (r, c))
            computeNeighbors()
            minesPlaced = true
            status = .playing
            startTimer()
        }

        if board[r][c].isMine {
            revealAllMines()
            status = .lost
            stopTimer()
            return
        }

        floodFill(r, c)

        if checkWin() {
            status = .won
            stopTimer()
        }
    }

    func toggleFlag(_ r: Int, _ c: Int) {
        guard status == .idle || status == .playing else { return }
        switch board[r][c].state {
        case .hidden:
            board[r][c].state = .flagged
            flagCount += 1
        case .flagged:
            board[r][c].state = .hidden
            flagCount -= 1
        case .revealed: break
        }
    }

    // MARK: private

    private func placeMines(safe: (Int, Int)) {
        var positions: [(Int, Int)] = []
        for r in 0..<rows {
            for c in 0..<cols where (r, c) != safe {
                positions.append((r, c))
            }
        }
        positions.shuffle()
        for (r, c) in positions.prefix(mineCount) {
            board[r][c].isMine = true
        }
    }

    private func computeNeighbors() {
        for r in 0..<rows {
            for c in 0..<cols {
                if board[r][c].isMine { continue }
                var count = 0
                for dr in -1...1 {
                    for dc in -1...1 where !(dr == 0 && dc == 0) {
                        let nr = r + dr, nc = c + dc
                        if nr >= 0, nr < rows, nc >= 0, nc < cols, board[nr][nc].isMine {
                            count += 1
                        }
                    }
                }
                board[r][c].neighbors = count
            }
        }
    }

    private func floodFill(_ r: Int, _ c: Int) {
        guard r >= 0, r < rows, c >= 0, c < cols else { return }
        guard board[r][c].state == .hidden else { return }
        guard !board[r][c].isMine else { return }
        board[r][c].state = .revealed
        if board[r][c].neighbors == 0 {
            for dr in -1...1 {
                for dc in -1...1 where !(dr == 0 && dc == 0) {
                    floodFill(r + dr, c + dc)
                }
            }
        }
    }

    private func revealAllMines() {
        for r in 0..<rows {
            for c in 0..<cols where board[r][c].isMine {
                board[r][c].state = .revealed
            }
        }
    }

    private func checkWin() -> Bool {
        for row in board {
            for cell in row where !cell.isMine && cell.state != .revealed {
                return false
            }
        }
        return true
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.elapsed += 1
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}

// MARK: - Theme (Win95 minesweeper palette)

extension Color {
    static let win95Gray   = Color(red: 0xC0/255, green: 0xC0/255, blue: 0xC0/255)
    static let win95Light  = Color.white
    static let win95Shadow = Color(red: 0x80/255, green: 0x80/255, blue: 0x80/255)
    static let win95Dark   = Color(red: 0x40/255, green: 0x40/255, blue: 0x40/255)
    static let win95BG     = Color(red: 0x5D/255, green: 0x5D/255, blue: 0x5D/255)
    static let win95Title  = Color(red: 0x3E/255, green: 0x52/255, blue: 0x78/255)
    static let ledBG       = Color.black
    static let ledRed      = Color(red: 0xFF/255, green: 0x20/255, blue: 0x20/255)

    static let mineN1 = Color(red: 0x1F/255, green: 0x57/255, blue: 0xC3/255)
    static let mineN2 = Color(red: 0x00/255, green: 0x80/255, blue: 0x00/255)
    static let mineN3 = Color(red: 0xC5/255, green: 0x28/255, blue: 0x28/255)
    static let mineN4 = Color(red: 0x00/255, green: 0x00/255, blue: 0x80/255)
    static let mineN5 = Color(red: 0x80/255, green: 0x00/255, blue: 0x00/255)
    static let mineN6 = Color(red: 0x00/255, green: 0x80/255, blue: 0x80/255)
    static let mineN7 = Color.black
    static let mineN8 = Color(red: 0x80/255, green: 0x80/255, blue: 0x80/255)
}

// MARK: - Bomb icon (PWA 메인 타이틀바용 흰 폭탄)

struct BombIcon: View {
    var size: CGFloat = 22

    var body: some View {
        Canvas { ctx, drawSize in
            // PWA SVG: viewBox 0 0 512 512, circle r=100, 8 spike lines stroke-width=22
            let scale = drawSize.width / 512.0
            let cx = drawSize.width / 2
            let cy = drawSize.height / 2
            let r = 100 * scale

            ctx.fill(Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: 2*r, height: 2*r)),
                     with: .color(.white))

            let spikes: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
                (256, 176, 256, 100), (256, 336, 256, 412),  // top, bottom
                (176, 256, 100, 256), (336, 256, 412, 256),  // left, right
                (199, 199, 146, 146), (313, 313, 366, 366),  // tl, br
                (199, 313, 146, 366), (313, 199, 366, 146),  // bl, tr
            ]
            var path = Path()
            for (x1, y1, x2, y2) in spikes {
                path.move(to: CGPoint(x: x1 * scale, y: y1 * scale))
                path.addLine(to: CGPoint(x: x2 * scale, y: y2 * scale))
            }
            ctx.stroke(path, with: .color(.white),
                       style: StrokeStyle(lineWidth: 22 * scale, lineCap: .round))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Bevel (Win95 3D border)

enum BevelStyle { case outset, inset }

struct Bevel: View {
    let style: BevelStyle
    let width: CGFloat

    var body: some View {
        // Canvas: 4번 fill — ZStack/VStack 트리 대비 view graph 훨씬 가벼움
        Canvas { ctx, size in
            let tl: Color = style == .outset ? .win95Light : .win95Shadow
            let br: Color = style == .outset ? .win95Shadow : .win95Light
            let w = width
            ctx.fill(Path(CGRect(x: 0, y: 0, width: size.width, height: w)), with: .color(tl))
            ctx.fill(Path(CGRect(x: 0, y: 0, width: w, height: size.height)), with: .color(tl))
            ctx.fill(Path(CGRect(x: 0, y: size.height - w, width: size.width, height: w)), with: .color(br))
            ctx.fill(Path(CGRect(x: size.width - w, y: 0, width: w, height: size.height)), with: .color(br))
        }
        .allowsHitTesting(false)
    }
}

extension View {
    func beveled(_ style: BevelStyle, width: CGFloat = 2) -> some View {
        self.overlay(Bevel(style: style, width: width))
    }
}

// MARK: - App root (home ↔ game routing)

struct ContentView: View {
    @State private var selected: Difficulty? = nil

    var body: some View {
        ZStack {
            Color.win95BG.ignoresSafeArea()
            if let d = selected {
                GameView(difficulty: d, onBack: {
                    withAnimation(.easeOut(duration: 0.2)) { selected = nil }
                })
                .transition(.move(edge: .trailing))
            } else {
                HomeView(onSelect: { d in
                    withAnimation(.easeOut(duration: 0.2)) { selected = d }
                })
                .transition(.move(edge: .leading))
            }
        }
    }
}

// MARK: - Home

struct HomeView: View {
    let onSelect: (Difficulty) -> Void

    var body: some View {
        VStack {
            Spacer()
            dialogWindow
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var dialogWindow: some View {
        VStack(spacing: 0) {
            // Title bar — PWA: 폭탄 + "지뢰찾기" + 폭탄
            HStack(spacing: 10) {
                BombIcon(size: 22)
                Text("지뢰찾기")
                    .font(.system(size: 22, weight: .bold))
                    .tracking(2.5)
                    .foregroundStyle(Color.white)
                BombIcon(size: 22)
            }
            .padding(.top, 16)
            .padding(.bottom, 11)
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity)
            .background(Color.win95Title)

            // Body
            VStack(spacing: 12) {
                ForEach(Difficulty.allCases) { d in
                    menuButton(d)
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity)
            .background(Color.win95Gray)
        }
        .padding(3)  // dialog inner padding (matches PWA .dialog-window padding: 3px)
        .background(Color.win95Gray)
        .beveled(.outset, width: 3)
        .frame(maxWidth: 360)
        .padding(.horizontal, 16)
    }

    private func menuButton(_ d: Difficulty) -> some View {
        Button(action: { onSelect(d) }) {
            VStack(spacing: 4) {
                Text(d.label)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.black)
                Text(d.subtitle)
                    .font(.system(size: 12, weight: .regular, design: .monospaced))
                    .foregroundStyle(Color.win95Dark)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.win95Gray)
            .beveled(.outset, width: 2)
        }
        .buttonStyle(PressableButtonStyle())
    }
}

// 누름 효과 — outset → inset 베벨 토글
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .overlay {
                if configuration.isPressed {
                    Bevel(style: .inset, width: 2)
                }
            }
    }
}

// MARK: - Game

struct GameView: View {
    let difficulty: Difficulty
    let onBack: () -> Void

    @State private var model: GameModel

    init(difficulty: Difficulty, onBack: @escaping () -> Void) {
        self.difficulty = difficulty
        self.onBack = onBack
        _model = State(initialValue: GameModel(difficulty: difficulty))
    }

    var body: some View {
        GeometryReader { geo in
            let cellSize = computeCellSize(in: geo.size)

            VStack(spacing: 12) {
                topBar
                gameFrame(cellSize: cellSize)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .frame(maxWidth: .infinity)
        }
    }

    private func computeCellSize(in size: CGSize) -> CGFloat {
        // 페이지 패딩 + gameFrame 외곽 베벨/패딩 + 보드 inset 베벨 패딩
        let horizontalChrome: CGFloat = 24 + 6 + 12 + 6
        // 페이지 top + topBar + spacing + 상태바 + spacing + 보드 외곽 chrome + 하단 여유
        let verticalChrome: CGFloat = 12 + 36 + 12 + 50 + 6 + 18 + 30
        let availW = max(40, size.width - horizontalChrome)
        let availH = max(40, size.height - verticalChrome)
        let byW = availW / CGFloat(model.cols)
        let byH = availH / CGFloat(model.rows)
        return floor(max(12, min(byW, byH, 56)))
    }

    private var topBar: some View {
        HStack {
            Button(action: onBack) {
                Text("← 메뉴")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.win95Gray)
                    .beveled(.outset, width: 2)
            }
            .buttonStyle(PressableButtonStyle())
            Spacer()
            Text(difficulty.label)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private func gameFrame(cellSize: CGFloat) -> some View {
        let contentWidth = CGFloat(model.cols) * cellSize + 6
        return VStack(spacing: 6) {
            statusBar.frame(width: contentWidth)
            boardView(cellSize: cellSize)
        }
        .padding(6)
        .background(Color.win95Gray)
        .beveled(.outset, width: 3)
        .fixedSize()
    }

    private var statusBar: some View {
        HStack(spacing: 8) {
            ledDigits(value: max(0, model.minesRemaining))
            Spacer()
            smileyButton
            Spacer()
            ledDigits(value: min(999, model.elapsed))
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
        .background(Color.win95Gray)
        .beveled(.inset, width: 2)
    }

    private func ledDigits(value: Int) -> some View {
        Text(String(format: "%03d", value))
            .font(.system(size: 26, weight: .bold, design: .monospaced))
            .foregroundStyle(Color.ledRed)
            .monospacedDigit()
            .tracking(1.5)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(Color.ledBG)
            .beveled(.inset, width: 1)
    }

    private var smileyButton: some View {
        Button(action: { model.newGame() }) {
            Text(smiley)
                .font(.system(size: 26))
                .frame(width: 40, height: 40)
                .background(Color.win95Gray)
                .beveled(.outset, width: 2)
        }
        .buttonStyle(.plain)
    }

    private var smiley: String {
        switch model.status {
        case .won: "😎"
        case .lost: "😵"
        case .idle, .playing: "🙂"
        }
    }

    private func boardView(cellSize: CGFloat) -> some View {
        VStack(spacing: 0) {
            ForEach(0..<model.rows, id: \.self) { r in
                HStack(spacing: 0) {
                    ForEach(0..<model.cols, id: \.self) { c in
                        CellView(
                            cell: model.board[r][c],
                            size: cellSize,
                            onTap: { model.reveal(r, c) },
                            onLongPress: { model.toggleFlag(r, c) }
                        )
                    }
                }
            }
        }
        .padding(3)
        .background(Color.win95Gray)
        .beveled(.inset, width: 3)
    }
}

// MARK: - Cell

struct CellView: View {
    let cell: Cell
    let size: CGFloat
    let onTap: () -> Void
    let onLongPress: () -> Void

    var body: some View {
        ZStack {
            Color.win95Gray
            content
        }
        .frame(width: size, height: size)
        .overlay(borderOverlay)
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
        .onLongPressGesture(minimumDuration: 0.4, perform: onLongPress)
    }

    @ViewBuilder
    private var borderOverlay: some View {
        if cell.state == .revealed {
            Rectangle().strokeBorder(Color.win95Shadow.opacity(0.5), lineWidth: 0.5)
        } else {
            Bevel(style: .outset, width: 2)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch cell.state {
        case .hidden:
            EmptyView()
        case .flagged:
            Text("🚩").font(.system(size: size * 0.55))
        case .revealed:
            if cell.isMine {
                Text("💣").font(.system(size: size * 0.6))
            } else if cell.neighbors > 0 {
                Text("\(cell.neighbors)")
                    .font(.system(size: size * 0.65, weight: .black, design: .monospaced))
                    .foregroundStyle(numberColor(cell.neighbors))
            }
        }
    }

    private func numberColor(_ n: Int) -> Color {
        switch n {
        case 1: .mineN1
        case 2: .mineN2
        case 3: .mineN3
        case 4: .mineN4
        case 5: .mineN5
        case 6: .mineN6
        case 7: .mineN7
        case 8: .mineN8
        default: .black
        }
    }
}

#Preview("Home") {
    ContentView()
}

#Preview("Game (Beginner)") {
    GameView(difficulty: .beginner, onBack: {})
        .background(Color.win95BG)
}

#Preview("Game (Expert)") {
    GameView(difficulty: .expert, onBack: {})
        .background(Color.win95BG)
}
