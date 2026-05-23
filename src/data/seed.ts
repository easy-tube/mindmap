/**
 * Seed mindmap — the Chozen product structure.
 *
 * Top-down:
 *   chozen (workspace)
 *   ├── marketplace
 *   ├── ranked
 *   │   ├── 1v1 Flip Loop
 *   │   ├── 1v1 Make Beat
 *   │   ├── ... (16 modes total)
 *   │   └── Mutuals Artists
 *   └── youtube-uploader
 *
 * Values pulled from docs/queue-modes-player-facing-rules.md (the
 * foundation doc). Empty fields are intentional — they're the
 * [B: ???] markers in the foundation doc, the things Thommy fills in
 * during the Magnus session.
 *
 * Positions are laid out as a tidy grid so the initial canvas doesn't
 * look like a hairball. Drill-in re-fits the view per level, so the
 * positions only really matter within a parent's local canvas.
 */
import type { Mindmap, Node } from '../types'

const GRID = 280  // horizontal spacing between siblings
const ROW = 220   // vertical spacing between rows

// ─── Top level ─────────────────────────────────────────────────────────

const chozen: Node = {
  id: 'chozen',
  parentId: null,
  kind: 'workspace',
  label: 'Chozen',
  data: {
    description:
      'Music-battle platform with a marketplace, ranked battles (1v1 / tournament / casual / mutuals × 4 gameplay styles), and a YouTube uploader. Pre-launch.',
  },
  position: { x: 0, y: 0 },
}

// ─── Product areas (children of chozen) ────────────────────────────────

const marketplace: Node = {
  id: 'marketplace',
  parentId: 'chozen',
  kind: 'product-area',
  label: 'Marketplace',
  data: {
    description:
      'Beat / loop / kit / sample sales, licensing, cart + Stripe, distribution. The original product surface; ranked and the uploader are built around it.',
    tech_stack: 'Next.js + OpenNext on Cloudflare Workers, D1, R2, Stripe',
    status: 'Shipped',
  },
  position: { x: -GRID, y: ROW },
}

const ranked: Node = {
  id: 'ranked',
  parentId: 'chozen',
  kind: 'product-area',
  label: 'Ranked',
  data: {
    description:
      'Real-time music battles. Players queue, get matched, produce on the same loop (or beat), submit, vote, see a rendered reel. 16 modes across 4 battle types × 4 gameplay styles.',
    tech_stack:
      'Cloudflare Durable Objects (matchmaker / lobby / battle), D1, Electron overlay (capture FL Studio screen + audio), render.com renderer (ffmpeg)',
    status: 'In progress',
  },
  position: { x: 0, y: ROW },
}

const ytUploader: Node = {
  id: 'youtube-uploader',
  parentId: 'chozen',
  kind: 'product-area',
  label: 'YouTube Uploader',
  data: {
    description:
      'Desktop app (Electron). Producers bulk-upload beats to YouTube + Chozen marketplace in one flow. Smart titles, type-beat templates, watermark tiers.',
    tech_stack: 'Electron, YouTube API, Chozen API, FFmpeg for visualizations',
    status: 'Shipped',
  },
  position: { x: GRID, y: ROW },
}

// ─── The 16 game modes (children of ranked) ────────────────────────────

type ModeSpec = {
  id: string
  label: string
  battleType: '1v1' | 'tournament' | 'casual' | 'mutuals'
  gameplayStyle: 'flip-loop' | 'freestyle' | 'make-loop' | 'artists'
  playerCount: string
  prepSec: number
  ranked: boolean
  friendLobby: boolean
  capturesVideo: boolean
  capturesGif: boolean
  rendersMp4: boolean
  reelPath: 'flip-loop' | 'artist-flip-beat' | 'series-intro' | 'minimal' | 'TBD'
  hasLoopIntro: boolean
  renderDefaultBars: number | null
  renderIntroBars: number
  renderAllowDoublePass: boolean
  introChromeNotes: string
  exceptions: string
}

const MODES: ModeSpec[] = [
  // ── 1v1 (ranked, 2-player locked) ─────────────────────────────────
  {
    id: 'mode-1v1-flip-loop',
    label: '1v1 Flip Loop',
    battleType: '1v1',
    gameplayStyle: 'flip-loop',
    playerCount: '2/2',
    prepSec: 45,
    ranked: true,
    friendLobby: false,
    capturesVideo: true,
    capturesGif: true,
    rendersMp4: false,  // per-toggle in queue
    reelPath: 'flip-loop',
    hasLoopIntro: true,
    renderDefaultBars: 8,
    renderIntroBars: 8,
    renderAllowDoublePass: false,
    introChromeNotes:
      'During loop intro (0–15.87s): "ORIGINAL LOOP BY @creator" + loop name + BPM + avatar (green ring). During producer segments: producer handle box (top-left with #N rank) + niche/gameMode tag (bottom-left).',
    exceptions:
      '45s prep is generous — most players use it to drag loop into a new FL Studio project. Reel-toggle warning if 5+ lobby (cap is 5).',
  },
  {
    id: 'mode-1v1-make-beat',
    label: '1v1 Make Beat',
    battleType: '1v1',
    gameplayStyle: 'freestyle',
    playerCount: '2/2',
    prepSec: 0,
    ranked: true,
    friendLobby: false,
    capturesVideo: true,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'TBD',
    hasLoopIntro: false,
    renderDefaultBars: 8,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: 'No loop intro currently. Reel starts with producer segments.',
    exceptions: 'No loop, no prep — battle starts at queue match. Pure freestyle.',
  },
  {
    id: 'mode-1v1-make-loop',
    label: '1v1 Make Loop',
    battleType: '1v1',
    gameplayStyle: 'make-loop',
    playerCount: '2/2',
    prepSec: 0,
    ranked: true,
    friendLobby: false,
    capturesVideo: true,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'TBD',
    hasLoopIntro: false,
    renderDefaultBars: null,  // TBD: 4-8 per spec
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: 'No loop intro.',
    exceptions: 'Loops are usually shorter than full beats — render math should reflect.',
  },
  {
    id: 'mode-1v1-artists',
    label: '1v1 Artists',
    battleType: '1v1',
    gameplayStyle: 'artists',
    playerCount: '2/2',
    prepSec: 0,
    ranked: true,
    friendLobby: false,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'artist-flip-beat',
    hasLoopIntro: false,
    renderDefaultBars: 12,
    renderIntroBars: 8,
    renderAllowDoublePass: false,
    introChromeNotes:
      'During beat intro: original producer handle + beat name. During artist segments: artist handle box + VS tag.',
    exceptions:
      'No flip-loop loop — the BEAT functions as shared content. Both artists rap/sing over same beat. Picker analyzes BEAT audio for onset detection (NOT artist vocals). Vocal-only submission.',
  },
  // ── Tournament (5-player single-elim) ─────────────────────────────
  {
    id: 'mode-tournament-flip-loop',
    label: 'Tournament Flip Loop',
    battleType: 'tournament',
    gameplayStyle: 'flip-loop',
    playerCount: '5/5',
    prepSec: 45,
    ranked: true,
    friendLobby: false,
    capturesVideo: true,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'flip-loop',
    hasLoopIntro: true,
    renderDefaultBars: 6,
    renderIntroBars: 8,
    renderAllowDoublePass: false,
    introChromeNotes: 'Same as 1v1 Flip Loop + round indicator ("ROUND 2 OF 3").',
    exceptions: 'Single-elimination bracket. Bracket format TBD (5-player byes vs 4-player wildcard).',
  },
  {
    id: 'mode-tournament-make-beat',
    label: 'Tournament Make Beat',
    battleType: 'tournament',
    gameplayStyle: 'freestyle',
    playerCount: '5/5',
    prepSec: 0,
    ranked: true,
    friendLobby: false,
    capturesVideo: true,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'TBD',
    hasLoopIntro: false,
    renderDefaultBars: 6,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: '',
    exceptions: '',
  },
  {
    id: 'mode-tournament-make-loop',
    label: 'Tournament Make Loop',
    battleType: 'tournament',
    gameplayStyle: 'make-loop',
    playerCount: '5/5',
    prepSec: 0,
    ranked: true,
    friendLobby: false,
    capturesVideo: true,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'TBD',
    hasLoopIntro: false,
    renderDefaultBars: null,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: '',
    exceptions: '',
  },
  {
    id: 'mode-tournament-artists',
    label: 'Tournament Artists',
    battleType: 'tournament',
    gameplayStyle: 'artists',
    playerCount: '5/5',
    prepSec: 0,
    ranked: true,
    friendLobby: false,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'artist-flip-beat',
    hasLoopIntro: false,
    renderDefaultBars: 6,
    renderIntroBars: 8,
    renderAllowDoublePass: false,
    introChromeNotes: '',
    exceptions: '5 artists over the same producer beat. Bracket flow.',
  },
  // ── Casual (audio-only, no reel) ──────────────────────────────────
  {
    id: 'mode-casual-flip-loop',
    label: 'Casual Flip Loop',
    battleType: 'casual',
    gameplayStyle: 'flip-loop',
    playerCount: '2-8',
    prepSec: 45,
    ranked: false,
    friendLobby: false,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'minimal',
    hasLoopIntro: false,
    renderDefaultBars: 0,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: 'N/A — no reel.',
    exceptions: 'Audio-only, no screen recording, no reel, no RP.',
  },
  {
    id: 'mode-casual-make-beat',
    label: 'Casual Make Beat',
    battleType: 'casual',
    gameplayStyle: 'freestyle',
    playerCount: '2-8',
    prepSec: 0,
    ranked: false,
    friendLobby: false,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'minimal',
    hasLoopIntro: false,
    renderDefaultBars: 0,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: 'N/A',
    exceptions: '',
  },
  {
    id: 'mode-casual-make-loop',
    label: 'Casual Make Loop',
    battleType: 'casual',
    gameplayStyle: 'make-loop',
    playerCount: '2-8',
    prepSec: 0,
    ranked: false,
    friendLobby: false,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'minimal',
    hasLoopIntro: false,
    renderDefaultBars: 0,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: 'N/A',
    exceptions: '',
  },
  {
    id: 'mode-casual-artists',
    label: 'Casual Artists',
    battleType: 'casual',
    gameplayStyle: 'artists',
    playerCount: '2-8',
    prepSec: 0,
    ranked: false,
    friendLobby: false,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'minimal',
    hasLoopIntro: false,
    renderDefaultBars: 0,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: 'N/A',
    exceptions: '',
  },
  // ── Mutuals (friends-only, opt-in reel) ───────────────────────────
  {
    id: 'mode-mutuals-flip-loop',
    label: 'Mutuals Flip Loop',
    battleType: 'mutuals',
    gameplayStyle: 'flip-loop',
    playerCount: '2-∞',
    prepSec: 45,
    ranked: false,
    friendLobby: true,
    capturesVideo: false,
    capturesGif: true,
    rendersMp4: false,  // opt-in via lobby creator
    reelPath: 'flip-loop',
    hasLoopIntro: true,
    renderDefaultBars: 8,
    renderIntroBars: 8,
    renderAllowDoublePass: false,  // true when player count >= 4
    introChromeNotes: 'Same as 1v1 Flip Loop + MUTUALS tag.',
    exceptions:
      '4-digit PIN, friend-of-friend join via lobbyId, quick-start vote (currently buggy — fires with 1 player). Reel-toggle opt-in.',
  },
  {
    id: 'mode-mutuals-make-beat',
    label: 'Mutuals Make Beat',
    battleType: 'mutuals',
    gameplayStyle: 'freestyle',
    playerCount: '2-∞',
    prepSec: 0,
    ranked: false,
    friendLobby: true,
    capturesVideo: false,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'TBD',
    hasLoopIntro: false,
    renderDefaultBars: 8,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: '',
    exceptions: '',
  },
  {
    id: 'mode-mutuals-make-loop',
    label: 'Mutuals Make Loop',
    battleType: 'mutuals',
    gameplayStyle: 'make-loop',
    playerCount: '2-∞',
    prepSec: 0,
    ranked: false,
    friendLobby: true,
    capturesVideo: false,
    capturesGif: true,
    rendersMp4: false,
    reelPath: 'TBD',
    hasLoopIntro: false,
    renderDefaultBars: null,
    renderIntroBars: 0,
    renderAllowDoublePass: false,
    introChromeNotes: '',
    exceptions: '',
  },
  {
    id: 'mode-mutuals-artists',
    label: 'Mutuals Artists',
    battleType: 'mutuals',
    gameplayStyle: 'artists',
    playerCount: '2-∞',
    prepSec: 0,
    ranked: false,
    friendLobby: true,
    capturesVideo: false,
    capturesGif: false,
    rendersMp4: false,
    reelPath: 'artist-flip-beat',
    hasLoopIntro: false,
    renderDefaultBars: 12,
    renderIntroBars: 8,
    renderAllowDoublePass: false,
    introChromeNotes: '',
    exceptions: '',
  },
]

const modeNodes: Node[] = MODES.map((m, i) => {
  // 4 columns × 4 rows grid. Battle type orders the columns:
  // 1v1 | tournament | casual | mutuals.
  const battleOrder = { '1v1': 0, tournament: 1, casual: 2, mutuals: 3 }
  const styleOrder = { 'flip-loop': 0, freestyle: 1, 'make-loop': 2, artists: 3 }
  const col = battleOrder[m.battleType]
  const row = styleOrder[m.gameplayStyle]
  return {
    id: m.id,
    parentId: 'ranked',
    kind: 'game-mode',
    label: m.label,
    position: { x: col * GRID, y: row * ROW },
    data: {
      battle_type: m.battleType,
      gameplay_style: m.gameplayStyle,
      player_count: m.playerCount,
      prep_sec: m.prepSec,
      ranked: m.ranked,
      friend_lobby: m.friendLobby,
      captures_video: m.capturesVideo,
      captures_gif: m.capturesGif,
      renders_mp4: m.rendersMp4,
      reel_path: m.reelPath,
      has_loop_intro: m.hasLoopIntro,
      render_default_bars: m.renderDefaultBars,
      render_intro_bars: m.renderIntroBars,
      render_allow_double_pass: m.renderAllowDoublePass,
      render_max_sec: null,           // empty = Magnus-session input
      render_target_sec: null,
      intro_text_rule_summary: '',    // empty = Magnus-session input
      intro_chrome_notes: m.introChromeNotes,
      exceptions: m.exceptions,
    },
    // Don't suppress i — keep it to silence linter even when unused.
    ...(i === -1 && {}),
  }
})

// ─── Assemble ──────────────────────────────────────────────────────────

const allNodes: Node[] = [
  chozen,
  marketplace,
  ranked,
  ytUploader,
  ...modeNodes,
]

export const seedMindmap: Mindmap = {
  version: 1,
  rootId: chozen.id,
  nodes: Object.fromEntries(allNodes.map((n) => [n.id, n])),
  components: {},
}
