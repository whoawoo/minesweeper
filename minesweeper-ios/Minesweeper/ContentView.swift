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

enum Difficulty: String, CaseIterable, Identifiable {
    case beginner, intermediate, expert
    var id: String { rawValue }
    var label: String {
        switch self {
        case .beginner: "초급"
        case .intermediate: "중급"
        case .expert: "고급"
        }
    }
    var rows: Int { switch self { case .beginner: 9; case .intermediate: 16; case .expert: 16 } }
    var cols: Int { switch self { case .beginner: 9; case .intermediate: 16; case .expert: 30 } }
    var mines: Int { switch self { case .beginner: 10; case .intermediate: 40; case .expert: 99 } }
}

@Observable
final class GameModel {
    var difficulty: Difficulty
    var board: [[Cell]]
    var status: GameStatus = .idle
    var elapsed: Int = 0

    private var minesPlaced = false
    private var timer: Timer?

    var rows: Int { difficulty.rows }
    var cols: Int { difficulty.cols }
    var mineCount: Int { difficulty.mines }
    var flagCount: Int { board.flatMap { $0 }.filter { $0.state == .flagged }.count }
    var minesRemaining: Int { mineCount - flagCount }

    init(difficulty: Difficulty = .beginner) {
        self.difficulty = difficulty
        self.board = Self.emptyBoard(rows: difficulty.rows, cols: difficulty.cols)
    }

    static func emptyBoard(rows: Int, cols: Int) -> [[Cell]] {
        Array(repeating: Array(repeating: Cell(), count: cols), count: rows)
    }

    func newGame() {
        board = Self.emptyBoard(rows: rows, cols: cols)
        status = .idle
        elapsed = 0
        minesPlaced = false
        stopTimer()
    }

    func changeDifficulty(_ d: Difficulty) {
        difficulty = d
        newGame()
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
        case .hidden: board[r][c].state = .flagged
        case .flagged: board[r][c].state = .hidden
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

// MARK: - Views

struct ContentView: View {
    @State private var model = GameModel()

    var body: some View {
        VStack(spacing: 16) {
            difficultyPicker
            statusBar
            boardView
            Spacer()
        }
        .padding()
    }

    private var difficultyPicker: some View {
        Picker("난이도", selection: Binding(
            get: { model.difficulty },
            set: { model.changeDifficulty($0) }
        )) {
            ForEach(Difficulty.allCases) { d in
                Text(d.label).tag(d)
            }
        }
        .pickerStyle(.segmented)
    }

    private var statusBar: some View {
        HStack {
            digitDisplay(value: max(0, model.minesRemaining))
            Spacer()
            Button(action: { model.newGame() }) {
                Text(smiley).font(.system(size: 40))
            }
            .buttonStyle(.plain)
            Spacer()
            digitDisplay(value: min(999, model.elapsed))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color(white: 0.85))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func digitDisplay(value: Int) -> some View {
        Text(String(format: "%03d", value))
            .font(.system(.title2, design: .monospaced).weight(.bold))
            .foregroundStyle(.red)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.black)
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var smiley: String {
        switch model.status {
        case .won: "😎"
        case .lost: "😵"
        case .idle, .playing: "🙂"
        }
    }

    private var boardView: some View {
        GeometryReader { geo in
            let cellW = geo.size.width / CGFloat(model.cols)
            let cellH = geo.size.height / CGFloat(model.rows)
            let size = min(cellW, cellH)
            VStack(spacing: 1) {
                ForEach(0..<model.rows, id: \.self) { r in
                    HStack(spacing: 1) {
                        ForEach(0..<model.cols, id: \.self) { c in
                            CellView(
                                cell: model.board[r][c],
                                size: size,
                                gameOver: model.status == .lost,
                                onTap: { model.reveal(r, c) },
                                onLongPress: { model.toggleFlag(r, c) }
                            )
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(CGFloat(model.cols) / CGFloat(model.rows), contentMode: .fit)
    }
}

struct CellView: View {
    let cell: Cell
    let size: CGFloat
    let gameOver: Bool
    let onTap: () -> Void
    let onLongPress: () -> Void

    var body: some View {
        ZStack {
            background
            content
        }
        .frame(width: size, height: size)
        .contentShape(Rectangle())
        .onTapGesture { onTap() }
        .onLongPressGesture(minimumDuration: 0.4) { onLongPress() }
    }

    private var background: some View {
        Rectangle()
            .fill(bgColor)
    }

    private var bgColor: Color {
        if cell.state == .revealed {
            return cell.isMine ? Color.red.opacity(0.8) : Color(white: 0.88)
        }
        return Color(white: 0.72)
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
                    .font(.system(size: size * 0.7, weight: .bold, design: .monospaced))
                    .foregroundStyle(numberColor(cell.neighbors))
            }
        }
    }

    private func numberColor(_ n: Int) -> Color {
        switch n {
        case 1: .blue
        case 2: .green
        case 3: .red
        case 4: .purple
        case 5: .brown
        case 6: .teal
        case 7: .black
        case 8: .gray
        default: .black
        }
    }
}

#Preview {
    ContentView()
}
