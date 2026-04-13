export const AppConfig = {
  ai: {
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX_REQUESTS: 5,
    DIAGRAM_TEMPERATURE: 0.2,
    DIAGRAM_MAX_TOKENS: 2048,
    ANALYSIS_TEMPERATURE: 0.1,
    ANALYSIS_MAX_TOKENS: 1024,
  },

  canvas: {
    ZOOM_MIN: 0.1,
    ZOOM_MAX: 500,
    ZOOM_STEP_FACTOR: 1.05,
    DIFF_ADDED_COLOR: "#4caf50",
    DIFF_REMOVED_COLOR: "#ef5350",
    DRAG_SELECT_THRESHOLD_PX: 6,
    SELECTION_RECT_DASH: [5, 3] as number[],
    SELECTION_RECT_FILL_OPACITY: 0.1,
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 600,
  },

  ui: {
    DEFAULT_INTERACTION_MODE: "select" as const,
    DEFAULT_ELEMENT_TYPE: "object" as const,
    DEFAULT_RELATIONSHIP_TYPE: "-->" as const,
    DEFAULT_RENDER_STYLE: "svg" as const,
    COLOR_PALETTE: [
      "#e05c5c",
      "#e07a2f",
      "#d4a017",
      "#5cb85c",
      "#2f9ee0",
      "#7b5ce0",
      "#d45cb8",
      "#5ce0c8",
    ] as string[],
    TAB_BROADCAST_DEBOUNCE_MS: 300,
  },

  editor: {
    FONT_SIZE: 14,
    TAB_SIZE: 2,
  },

  parser: {
    MAX_NESTING_DEPTH: 1000,
    ANONYMOUS_ID_PREFIX: "anon",
  },

  history: {
    DEBOUNCE_MS: 500,
    SAVE_DEBOUNCE_MS: 1000,
  },

  execution: {
    DEFAULT_TICK_INTERVAL_MS: 500,
    TOKEN_COLOR: "#f97316",
  },

  layout: {
    CHILD_FILL: 0.85,
    ELEMENT_FILL: 0.7,
    RADIO: 3.3,
    SIZE_EXP: 0.9,
    SIZE_MULT: 30,
  },
} as const;
