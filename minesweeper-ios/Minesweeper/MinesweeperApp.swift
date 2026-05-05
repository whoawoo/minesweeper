//
//  MinesweeperApp.swift
//  Minesweeper
//
//  Created by 밍묭 on 5/5/26.
//

import SwiftUI

@main
struct MinesweeperApp: App {
    init() {
        // 첫 셀 탭에 audio engine 초기화가 동기로 일어나면 래그가 보이므로 앱 시작 시 미리
        _ = GameSounds.shared
    }
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
