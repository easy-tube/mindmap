/**
 * Node-kind → field schema registry.
 *
 * Each "kind" is a recognizable shape of node. The renderer (ModeNode.tsx)
 * looks up the kind's Field[] here, then renders the fields whose
 * visibleIn matches the current view mode.
 *
 * v0.2 ships the kinds we need to model the Chozen tree:
 *   - 'workspace' — top-level container ("Chozen")
 *   - 'product-area' — Marketplace, Ranked, YouTube Uploader
 *   - 'game-mode' — the 16 ranked modes; carries the most fields
 *   - 'note' — generic free-text card (will be more useful in v0.3 when
 *              we add inline canvases)
 *
 * Adding a kind = add an entry here + (optionally) a custom renderer in
 * canvas/nodes/. The default renderer handles all field types.
 */
import type { Field, NodeKind } from '../types'

export const kindFields: Record<NodeKind, Field[]> = {
  workspace: [
    {
      key: 'description',
      label: 'Description',
      type: 'longtext',
      visibleIn: ['code', 'user', 'simplified'],
      placeholder: 'What is this workspace about?',
    },
  ],

  'product-area': [
    {
      key: 'description',
      label: 'Description',
      type: 'longtext',
      visibleIn: ['user', 'simplified'],
      placeholder: 'One-paragraph summary',
    },
    {
      key: 'tech_stack',
      label: 'Tech stack',
      type: 'longtext',
      visibleIn: ['code'],
      placeholder: 'Languages, frameworks, services',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      enumValues: ['Concept', 'In progress', 'Shipped', 'Maintenance'],
      visibleIn: ['code', 'user'],
    },
  ],

  'game-mode': [
    // a) Queue mechanics
    {
      key: 'battle_type',
      label: 'Battle type',
      type: 'enum',
      enumValues: ['1v1', 'tournament', 'casual', 'mutuals'],
      visibleIn: ['code', 'user', 'simplified'],
    },
    {
      key: 'gameplay_style',
      label: 'Gameplay style',
      type: 'enum',
      enumValues: ['flip-loop', 'freestyle', 'make-loop', 'artists'],
      visibleIn: ['code', 'user', 'simplified'],
    },
    {
      key: 'player_count',
      label: 'Player count',
      type: 'string',
      visibleIn: ['code', 'user', 'simplified'],
      placeholder: '2/2 | 5/5 | 2-8 | 2-∞',
    },
    {
      key: 'prep_sec',
      label: 'Prep phase (sec)',
      type: 'number',
      visibleIn: ['code', 'user'],
    },
    {
      key: 'ranked',
      label: 'Ranked',
      type: 'bool',
      visibleIn: ['code', 'user', 'simplified'],
    },
    {
      key: 'friend_lobby',
      label: 'Friend lobby',
      type: 'bool',
      visibleIn: ['code'],
    },
    // b) Capture
    {
      key: 'captures_video',
      label: 'Captures video',
      type: 'bool',
      visibleIn: ['code'],
    },
    {
      key: 'captures_gif',
      label: 'Captures gif',
      type: 'bool',
      visibleIn: ['code'],
    },
    // c) Reel render rules
    {
      key: 'renders_mp4',
      label: 'Renders MP4',
      type: 'bool',
      visibleIn: ['code', 'user'],
    },
    {
      key: 'reel_path',
      label: 'Reel path',
      type: 'enum',
      enumValues: ['flip-loop', 'artist-flip-beat', 'series-intro', 'minimal', 'TBD'],
      visibleIn: ['code'],
    },
    {
      key: 'has_loop_intro',
      label: 'Has loop intro',
      type: 'bool',
      visibleIn: ['code'],
    },
    {
      key: 'render_default_bars',
      label: 'Default bars',
      type: 'number',
      visibleIn: ['code'],
    },
    {
      key: 'render_intro_bars',
      label: 'Intro bars',
      type: 'number',
      visibleIn: ['code'],
    },
    {
      key: 'render_max_sec',
      label: 'Render max (sec)',
      type: 'number',
      visibleIn: ['code'],
      placeholder: 'TBD — Magnus session',
    },
    {
      key: 'render_target_sec',
      label: 'Render target (sec)',
      type: 'number',
      visibleIn: ['code'],
      placeholder: 'TBD — Magnus session',
    },
    {
      key: 'render_allow_double_pass',
      label: 'Allow double pass',
      type: 'bool',
      visibleIn: ['code'],
    },
    // d/e) Intro chrome + text animation
    {
      key: 'intro_text_rule_summary',
      label: 'Intro text rule summary',
      type: 'longtext',
      visibleIn: ['user', 'simplified'],
      placeholder: 'Rules are simple: … (12–15 words, shown in the reel intro animation)',
    },
    {
      key: 'intro_chrome_notes',
      label: 'Intro chrome',
      type: 'longtext',
      visibleIn: ['code'],
      placeholder: 'Drawtext currently rendered during intro',
    },
    // f) Exceptions
    {
      key: 'exceptions',
      label: 'Exceptions / weirdnesses',
      type: 'longtext',
      visibleIn: ['code', 'user'],
      placeholder: 'Anything that breaks the default pattern',
    },
  ],

  note: [
    {
      key: 'body',
      label: 'Note',
      type: 'longtext',
      visibleIn: ['code', 'user', 'simplified'],
    },
  ],
}
