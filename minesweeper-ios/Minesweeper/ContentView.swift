//
//  ContentView.swift
//  Minesweeper
//

import SwiftUI

// MARK: - Model

enum CellState: String, Codable {
    case hidden, revealed, flagged
}

struct Cell: Codable {
    var isMine: Bool = false
    var state: CellState = .hidden
    var neighbors: Int = 0
}

enum GameStatus: String, Codable {
    case idle, playing, won, lost
}

enum Difficulty: String, CaseIterable, Identifiable, Hashable, Codable {
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

// MARK: - Settings (UserDefaults)

enum AppSettings {
    static let deductionModeKey = "deductionMode"

    // PWA 기본값과 동일하게 on
    static var deductionMode: Bool {
        get { UserDefaults.standard.object(forKey: deductionModeKey) as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: deductionModeKey) }
    }
}

// MARK: - Persistence

struct GameSnapshot: Codable {
    var difficulty: Difficulty
    var board: [[Cell]]
    var status: GameStatus
    var elapsed: Int
    var flagCount: Int
    var minesPlaced: Bool
    var savedAt: Date
}

enum GamePersistence {
    private static var fileURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent("savegame.json")
    }

    static func save(_ snapshot: GameSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    static func load() -> GameSnapshot? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(GameSnapshot.self, from: data)
    }

    static func clear() {
        try? FileManager.default.removeItem(at: fileURL)
    }
}

@Observable
final class GameModel {
    let difficulty: Difficulty
    var board: [[Cell]]
    var status: GameStatus = .idle
    var elapsed: Int = 0
    var flagCount: Int = 0  // 매 render마다 board 전체 순회 안 하도록 캐시
    var isPressing: Bool = false  // 셀 누름 중 — 스마일 😯 표시용

    private(set) var minesPlaced = false
    private var timer: Timer?

    var rows: Int { difficulty.rows }
    var cols: Int { difficulty.cols }
    var mineCount: Int { difficulty.mines }
    var minesRemaining: Int { mineCount - flagCount }

    init(difficulty: Difficulty) {
        self.difficulty = difficulty
        self.board = Self.emptyBoard(rows: difficulty.rows, cols: difficulty.cols)
    }

    init(snapshot: GameSnapshot) {
        self.difficulty = snapshot.difficulty
        self.board = snapshot.board
        self.status = snapshot.status
        self.elapsed = snapshot.elapsed
        self.flagCount = snapshot.flagCount
        self.minesPlaced = snapshot.minesPlaced
        if status == .playing {
            startTimer()
        }
    }

    deinit { timer?.invalidate() }

    private func snapshot() -> GameSnapshot {
        GameSnapshot(
            difficulty: difficulty,
            board: board,
            status: status,
            elapsed: elapsed,
            flagCount: flagCount,
            minesPlaced: minesPlaced,
            savedAt: Date()
        )
    }

    func saveIfPlaying() {
        if minesPlaced && status == .playing {
            GamePersistence.save(snapshot())
        } else {
            GamePersistence.clear()
        }
    }

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
        GamePersistence.clear()
    }

    func reveal(_ r: Int, _ c: Int) {
        guard status == .idle || status == .playing else { return }
        guard board[r][c].state == .hidden, board[r][c].state != .flagged else { return }

        if !minesPlaced {
            placeMines(safe: (r, c))  // 내부에서 placeMinesRandom이 neighbors까지 계산
            minesPlaced = true
            status = .playing
            startTimer()
        }

        // PWA와 동일: stack 기반 flood fill — 0인 칸 이웃을 계속 펼침
        var stack: [(Int, Int)] = [(r, c)]
        while let (cr, cc) = stack.popLast() {
            let cell = board[cr][cc]
            if cell.state == .revealed || cell.state == .flagged { continue }
            board[cr][cc].state = .revealed
            if cell.isMine {
                handleLose()
                return
            }
            if cell.neighbors == 0 {
                for dr in -1...1 {
                    for dc in -1...1 where !(dr == 0 && dc == 0) {
                        let nr = cr + dr, nc = cc + dc
                        if nr >= 0, nr < rows, nc >= 0, nc < cols, board[nr][nc].state != .revealed {
                            stack.append((nr, nc))
                        }
                    }
                }
            }
        }

        if checkWin() {
            handleWin()
        } else {
            saveIfPlaying()
        }
    }

    private func handleLose() {
        revealAllMines()
        status = .lost
        stopTimer()
        GamePersistence.clear()
    }

    private func handleWin() {
        // PWA와 동일: 남은 지뢰에 자동 깃발 + 카운터 0 표시
        flagAllMines()
        status = .won
        stopTimer()
        GamePersistence.clear()
    }

    private func flagAllMines() {
        for r in 0..<rows {
            for c in 0..<cols where board[r][c].isMine && board[r][c].state != .flagged {
                board[r][c].state = .flagged
                flagCount += 1
            }
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
        saveIfPlaying()
    }

    // MARK: private

    // PWA의 placeMines와 동일 구조: 추리모드 on이면 풀 수 있는 보드를 최대 300번 시도
    private func placeMines(safe: (Int, Int)) {
        if AppSettings.deductionMode {
            for _ in 0..<300 {
                placeMinesRandom(safe: safe)
                if isSolvableNoGuess(firstR: safe.0, firstC: safe.1) {
                    return
                }
            }
            // 300번 안에 해결되는 보드 못 만들면 폴백
        }
        placeMinesRandom(safe: safe)
    }

    // PWA placeMinesRandom과 동일: 보드 초기화 + 3×3 안전구역 + Fisher-Yates + 이웃 카운트
    private func placeMinesRandom(safe: (Int, Int)) {
        for r in 0..<rows {
            for c in 0..<cols {
                board[r][c].isMine = false
                board[r][c].neighbors = 0
            }
        }
        var safeSet = Set<Int>()
        for dr in -1...1 {
            for dc in -1...1 {
                let nr = safe.0 + dr, nc = safe.1 + dc
                if nr >= 0, nr < rows, nc >= 0, nc < cols {
                    safeSet.insert(nr * cols + nc)
                }
            }
        }
        var candidates: [(Int, Int)] = []
        for r in 0..<rows {
            for c in 0..<cols where !safeSet.contains(r * cols + c) {
                candidates.append((r, c))
            }
        }
        candidates.shuffle()
        for (r, c) in candidates.prefix(mineCount) {
            board[r][c].isMine = true
        }
        // 인접 지뢰 수
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

    // PWA isSolvableNoGuess 1:1 포팅 — 기본 추론 + subset 추론(1-2-1 같은 패턴)
    // 추측 없이 논리만으로 풀리는 보드면 true
    private func isSolvableNoGuess(firstR: Int, firstC: Int) -> Bool {
        struct Constraint {
            let minesLeft: Int
            let unknowns: Set<Int>
        }

        var revealedFlat = Array(repeating: false, count: rows * cols)
        var flaggedFlat = Array(repeating: false, count: rows * cols)
        let nCols = cols
        let nRows = rows

        @inline(__always) func idx(_ r: Int, _ c: Int) -> Int { r * nCols + c }

        func neighbors(_ r: Int, _ c: Int) -> [(Int, Int)] {
            var out: [(Int, Int)] = []
            out.reserveCapacity(8)
            for dr in -1...1 {
                for dc in -1...1 where !(dr == 0 && dc == 0) {
                    let nr = r + dr, nc = c + dc
                    if nr >= 0, nr < nRows, nc >= 0, nc < nCols {
                        out.append((nr, nc))
                    }
                }
            }
            return out
        }

        func flood(_ startR: Int, _ startC: Int) {
            var queue: [(Int, Int)] = [(startR, startC)]
            var head = 0
            while head < queue.count {
                let (r, c) = queue[head]
                head += 1
                let i = idx(r, c)
                if revealedFlat[i] { continue }
                revealedFlat[i] = true
                if board[r][c].neighbors == 0 {
                    for (nr, nc) in neighbors(r, c) {
                        if !board[nr][nc].isMine && !revealedFlat[idx(nr, nc)] {
                            queue.append((nr, nc))
                        }
                    }
                }
            }
        }

        flood(firstR, firstC)

        var changed = true
        while changed {
            changed = false

            // 1) 기본 추론: n - flaggedCount == unknowns → 모두 지뢰 / minesLeft == 0 → 모두 안전
            for r in 0..<nRows {
                for c in 0..<nCols {
                    let i = idx(r, c)
                    if !revealedFlat[i] || board[r][c].isMine { continue }
                    let n = board[r][c].neighbors
                    if n == 0 { continue }
                    var unknowns: [(Int, Int)] = []
                    var flaggedCount = 0
                    for (nr, nc) in neighbors(r, c) {
                        let ni = idx(nr, nc)
                        if !revealedFlat[ni] {
                            if flaggedFlat[ni] { flaggedCount += 1 }
                            else { unknowns.append((nr, nc)) }
                        }
                    }
                    if unknowns.isEmpty { continue }
                    let minesLeft = n - flaggedCount
                    if minesLeft == 0 {
                        for (nr, nc) in unknowns { flood(nr, nc) }
                        changed = true
                    } else if minesLeft == unknowns.count {
                        for (nr, nc) in unknowns { flaggedFlat[idx(nr, nc)] = true }
                        changed = true
                    }
                }
            }
            if changed { continue }

            // 2) Subset 추론: A.unknowns ⊂ B.unknowns 일 때, 차이 셀들의 지뢰 개수 결정 가능하면 사용
            var constraints: [Constraint] = []
            for r in 0..<nRows {
                for c in 0..<nCols {
                    let i = idx(r, c)
                    if !revealedFlat[i] || board[r][c].isMine { continue }
                    let n = board[r][c].neighbors
                    if n == 0 { continue }
                    var unknowns = Set<Int>()
                    var flaggedCount = 0
                    for (nr, nc) in neighbors(r, c) {
                        let ni = idx(nr, nc)
                        if !revealedFlat[ni] {
                            if flaggedFlat[ni] { flaggedCount += 1 }
                            else { unknowns.insert(ni) }
                        }
                    }
                    if unknowns.isEmpty { continue }
                    constraints.append(Constraint(minesLeft: n - flaggedCount, unknowns: unknowns))
                }
            }
            outer: for ai in 0..<constraints.count {
                let A = constraints[ai]
                for bi in 0..<constraints.count {
                    if ai == bi { continue }
                    let B = constraints[bi]
                    if A.unknowns.count >= B.unknowns.count { continue }
                    if !A.unknowns.isSubset(of: B.unknowns) { continue }
                    let diff = B.unknowns.subtracting(A.unknowns)
                    if diff.isEmpty { continue }
                    let diffMines = B.minesLeft - A.minesLeft
                    if diffMines == 0 {
                        for d in diff { flood(d / nCols, d % nCols) }
                        changed = true
                        break outer
                    } else if diffMines == diff.count {
                        for d in diff { flaggedFlat[d] = true }
                        changed = true
                        break outer
                    }
                }
            }
        }

        // 모든 비-지뢰 칸이 공개됐는가?
        for r in 0..<nRows {
            for c in 0..<nCols {
                if !board[r][c].isMine && !revealedFlat[idx(r, c)] { return false }
            }
        }
        return true
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
    @State private var gameModel: GameModel? = nil
    @State private var savedSnapshot: GameSnapshot? = nil
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            Color.win95BG.ignoresSafeArea()
            if let model = gameModel {
                GameView(model: model, onBack: {
                    savedSnapshot = GamePersistence.load()
                    withAnimation(.easeOut(duration: 0.2)) { gameModel = nil }
                })
                .transition(.move(edge: .trailing))
            } else {
                HomeView(
                    snapshot: savedSnapshot,
                    onResume: {
                        guard let s = savedSnapshot else { return }
                        withAnimation(.easeOut(duration: 0.2)) {
                            gameModel = GameModel(snapshot: s)
                        }
                    },
                    onSelect: { d in
                        withAnimation(.easeOut(duration: 0.2)) {
                            gameModel = GameModel(difficulty: d)
                        }
                    }
                )
                .transition(.move(edge: .leading))
            }
        }
        .onAppear { savedSnapshot = GamePersistence.load() }
        .onChange(of: scenePhase) { _, phase in
            // 백그라운드 진입 시 진행 중인 게임 한 번 더 안전 저장
            if phase == .background, let m = gameModel {
                m.saveIfPlaying()
            }
        }
    }
}

// MARK: - Home

struct HomeView: View {
    let snapshot: GameSnapshot?
    let onResume: () -> Void
    let onSelect: (Difficulty) -> Void

    @State private var showSettings = false

    var body: some View {
        VStack {
            Spacer()
            dialogWindow
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .presentationDetents([.medium])
        }
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
                if let s = snapshot {
                    resumeButton(s)
                }
                ForEach(Difficulty.allCases) { d in
                    menuButton(d)
                }
                settingsButton
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

    private var settingsButton: some View {
        Button(action: { showSettings = true }) {
            HStack(spacing: 6) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 16))
                Text("설정")
                    .font(.system(size: 14, weight: .bold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.win95Gray)
            .beveled(.outset, width: 2)
        }
        .buttonStyle(PressableButtonStyle())
    }

    private func resumeButton(_ s: GameSnapshot) -> some View {
        Button(action: onResume) {
            VStack(spacing: 4) {
                Text("▶ 이어하기")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.black)
                Text("\(s.difficulty.label) · \(formatElapsed(s.elapsed))")
                    .font(.system(size: 12, weight: .regular, design: .monospaced))
                    .foregroundStyle(Color.win95Dark)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(red: 0xD8/255, green: 0xE8/255, blue: 0xFF/255))  // resume tone (PWA --resume-bg)
            .beveled(.outset, width: 2)
        }
        .buttonStyle(PressableButtonStyle())
    }

    private func formatElapsed(_ s: Int) -> String {
        String(format: "%02d:%02d", s / 60, s % 60)
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

// MARK: - Settings sheet

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppSettings.deductionModeKey) private var deductionMode: Bool = true

    var body: some View {
        VStack(spacing: 0) {
            // Title bar
            HStack {
                Text("설정")
                    .font(.system(size: 18, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .overlay(alignment: .trailing) {
                        Button(action: { dismiss() }) {
                            Text("✕")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                        }
                    }
            }
            .padding(.top, 12)
            .padding(.bottom, 9)
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity)
            .background(Color.win95Title)

            // Body
            VStack(alignment: .leading, spacing: 16) {
                deductionToggle
                Spacer()
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Color.win95Gray)
        }
        .padding(3)
        .background(Color.win95Gray)
        .beveled(.outset, width: 3)
        .padding(16)
        .background(Color.win95BG)
    }

    private var deductionToggle: some View {
        VStack(alignment: .leading, spacing: 6) {
            Toggle(isOn: $deductionMode) {
                Text("추리모드")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.black)
            }
            .tint(Color.win95Title)
            Text("추측 없이 논리만으로 풀 수 있는 보드만 생성. 첫 클릭 후 보드 생성에 약간 더 걸릴 수 있습니다.")
                .font(.system(size: 12))
                .foregroundStyle(Color.win95Dark)
                .fixedSize(horizontal: false, vertical: true)
        }
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
    let model: GameModel
    let onBack: () -> Void

    var difficulty: Difficulty { model.difficulty }

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
        case .idle, .playing: model.isPressing ? "😯" : "🙂"
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
                            onLongPress: { model.toggleFlag(r, c) },
                            onPressingChanged: { pressing in model.isPressing = pressing }
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
    let onPressingChanged: (Bool) -> Void

    @State private var pressed = false

    var body: some View {
        ZStack {
            Color.win95Gray
            content
        }
        .frame(width: size, height: size)
        .overlay(borderOverlay)
        .contentShape(Rectangle())
        // 0.4s — PWA의 LONG_PRESS_MS=400과 동일
        .onLongPressGesture(minimumDuration: 0.4, perform: onLongPress)
        .onTapGesture(perform: onTap)
        // 누름 감지는 별도 DragGesture(minDistance:0)로 — onLongPress의 onPressingChanged는
        // tap/longpress와 conflict로 안정적이지 않음
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !pressed {
                        pressed = true
                        onPressingChanged(true)
                    }
                }
                .onEnded { _ in
                    pressed = false
                    onPressingChanged(false)
                }
        )
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
    GameView(model: GameModel(difficulty: .beginner), onBack: {})
        .background(Color.win95BG)
}

#Preview("Game (Expert)") {
    GameView(model: GameModel(difficulty: .expert), onBack: {})
        .background(Color.win95BG)
}
