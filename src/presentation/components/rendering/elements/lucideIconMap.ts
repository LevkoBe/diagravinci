import Konva from "konva";

type IconNode = readonly [string, Record<string, string>][];

const ICONS: Record<string, IconNode> = {
  database: [
    ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
    ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5" }],
    ["path", { d: "M3 12A9 3 0 0 0 21 12" }],
  ],
  server: [
    ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" }],
    ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" }],
    ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6" }],
    ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18" }],
  ],
  user: [
    ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }],
    ["circle", { cx: "12", cy: "7", r: "4" }],
  ],
  users: [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { cx: "9", cy: "7", r: "4" }],
  ],
  cloud: [
    ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }],
  ],
  lock: [
    ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
    ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }],
  ],
  key: [
    [
      "path",
      { d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" },
    ],
    ["path", { d: "m21 2-9.6 9.6" }],
    ["circle", { cx: "7.5", cy: "15.5", r: "5.5" }],
  ],
  file: [
    [
      "path",
      {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      },
    ],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
  ],
  folder: [
    [
      "path",
      {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    ],
  ],
  settings: [
    [
      "path",
      {
        d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3" }],
  ],
  search: [
    ["path", { d: "m21 21-4.34-4.34" }],
    ["circle", { cx: "11", cy: "11", r: "8" }],
  ],
  clock: [
    ["path", { d: "M12 6v6l4 2" }],
    ["circle", { cx: "12", cy: "12", r: "10" }],
  ],
  calendar: [
    ["path", { d: "M8 2v4" }],
    ["path", { d: "M16 2v4" }],
    ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
    ["path", { d: "M3 10h18" }],
  ],
  mail: [
    ["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" }],
    ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }],
  ],
  shield: [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
  ],
  globe: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }],
    ["path", { d: "M2 12h20" }],
  ],
  network: [
    ["rect", { x: "16", y: "16", width: "6", height: "6", rx: "1" }],
    ["rect", { x: "2", y: "16", width: "6", height: "6", rx: "1" }],
    ["rect", { x: "9", y: "2", width: "6", height: "6", rx: "1" }],
    ["path", { d: "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" }],
    ["path", { d: "M12 12V8" }],
  ],
  zap: [
    [
      "path",
      {
        d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      },
    ],
  ],
  warning: [
    [
      "path",
      {
        d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      },
    ],
    ["path", { d: "M12 9v4" }],
    ["path", { d: "M12 17h.01" }],
  ],
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  x: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ],
  info: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "M12 16v-4" }],
    ["path", { d: "M12 8h.01" }],
  ],
  chart: [
    ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
    ["path", { d: "M8 17v-3" }],
    ["path", { d: "M12 17v-12" }],
    ["path", { d: "M16 17v-8" }],
  ],
  log: [
    ["path", { d: "M15 12h-5" }],
    ["path", { d: "M15 8h-5" }],
    ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4" }],
    [
      "path",
      {
        d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",
      },
    ],
  ],
  phone: [
    [
      "path",
      {
        d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
      },
    ],
  ],
  layers: [
    [
      "path",
      {
        d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      },
    ],
    [
      "path",
      {
        d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      },
    ],
    [
      "path",
      {
        d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
      },
    ],
  ],
  cpu: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
    ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1" }],
    ["path", { d: "M12 20v2" }],
    ["path", { d: "M12 2v2" }],
    ["path", { d: "M17 20v2" }],
    ["path", { d: "M17 2v2" }],
    ["path", { d: "M2 12h2" }],
    ["path", { d: "M2 17h2" }],
    ["path", { d: "M2 7h2" }],
    ["path", { d: "M20 12h2" }],
    ["path", { d: "M20 17h2" }],
    ["path", { d: "M20 7h2" }],
    ["path", { d: "M7 20v2" }],
    ["path", { d: "M7 2v2" }],
  ],
  router: [
    ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2" }],
    ["path", { d: "M6.01 18H6" }],
    ["path", { d: "M10.01 18H10" }],
    ["path", { d: "M15 10v4" }],
    ["path", { d: "M17.84 7.17a4 4 0 0 0-5.66 0" }],
    ["path", { d: "M20.66 4.34a8 8 0 0 0-11.31 0" }],
  ],
  workflow: [
    ["rect", { width: "8", height: "8", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M7 11v4a2 2 0 0 0 2 2h4" }],
    ["rect", { width: "8", height: "8", x: "13", y: "13", rx: "2" }],
  ],
  event: [
    ["path", { d: "M16.247 7.761a6 6 0 0 1 0 8.478" }],
    ["path", { d: "M19.075 4.933a10 10 0 0 1 0 14.134" }],
    ["path", { d: "M4.925 19.067a10 10 0 0 1 0-14.134" }],
    ["path", { d: "M7.753 16.239a6 6 0 0 1 0-8.478" }],
    ["circle", { cx: "12", cy: "12", r: "2" }],
  ],
  cache: [
    ["path", { d: "M21 2v6h-6" }],
    ["path", { d: "M21 13a9 9 0 1 1-3-7.7L21 8" }],
  ],
  storage: [
    ["path", { d: "M22 12H2" }],
    [
      "path",
      {
        d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      },
    ],
    ["line", { x1: "6", y1: "16", x2: "6.01", y2: "16" }],
    ["line", { x1: "10", y1: "16", x2: "10.01", y2: "16" }],
  ],
  queue: [
    ["line", { x1: "8", y1: "6", x2: "21", y2: "6" }],
    ["line", { x1: "8", y1: "12", x2: "21", y2: "12" }],
    ["line", { x1: "8", y1: "18", x2: "21", y2: "18" }],
    ["line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }],
    ["line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }],
    ["line", { x1: "3", y1: "18", x2: "3.01", y2: "18" }],
  ],
  api: [
    [
      "path",
      {
        d: "M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1",
      },
    ],
    [
      "path",
      {
        d: "M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1",
      },
    ],
  ],
  auth: [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
    ["path", { d: "m9 12 2 2 4-4" }],
  ],
  heart: [
    [
      "path",
      {
        d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
      },
    ],
  ],
  star: [
    [
      "path",
      {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      },
    ],
  ],
  sword: [
    ["polyline", { points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5" }],
    ["line", { x1: "13", x2: "19", y1: "19", y2: "13" }],
    ["line", { x1: "16", x2: "20", y1: "16", y2: "20" }],
    ["line", { x1: "19", x2: "21", y1: "21", y2: "19" }],
  ],
  eye: [
    [
      "path",
      {
        d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3" }],
  ],
  compass: [
    [
      "path",
      {
        d: "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "10" }],
  ],
  flame: [
    [
      "path",
      {
        d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
      },
    ],
  ],
  tome: [
    ["path", { d: "M12 7v14" }],
    [
      "path",
      {
        d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      },
    ],
  ],
  lyre: [
    ["path", { d: "M9 18V5l12-2v13" }],
    ["circle", { cx: "6", cy: "18", r: "3" }],
    ["circle", { cx: "18", cy: "16", r: "3" }],
  ],
  arrow: [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "m12 5 7 7-7 7" }],
  ],
  scroll: [
    ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4" }],
    [
      "path",
      {
        d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",
      },
    ],
    ["path", { d: "M15 8h-5" }],
    ["path", { d: "M15 12h-5" }],
  ],
  hammer: [
    ["path", { d: "m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" }],
    ["path", { d: "m18 15 4-4" }],
    [
      "path",
      {
        d: "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6 6 0 0 1 12 8.172V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14",
      },
    ],
  ],
  gem: [
    ["path", { d: "M6 3h12l4 6-10 13L2 9Z" }],
    ["path", { d: "M11 3 8 9l4 13 4-13-3-6" }],
    ["path", { d: "M2 9h20" }],
  ],
  medal: [
    [
      "path",
      {
        d: "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15",
      },
    ],
    ["path", { d: "M11 12 5.12 2.2" }],
    ["path", { d: "m13 12 5.88-9.8" }],
    ["path", { d: "M8 7h8" }],
    ["circle", { cx: "12", cy: "17", r: "5" }],
    ["path", { d: "M12 18v-2h-.5" }],
  ],
  crown: [
    [
      "path",
      {
        d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.886 9.964a1 1 0 0 1-.961.725H5.866a1 1 0 0 1-.961-.725L2.019 6.019a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
      },
    ],
    ["path", { d: "M5 21h14" }],
  ],
  flag: [
    [
      "path",
      { d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" },
    ],
    ["line", { x1: "4", x2: "4", y1: "22", y2: "15" }],
  ],
  telescope: [
    [
      "path",
      {
        d: "m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44",
      },
    ],
    ["path", { d: "m13.56 11.747 4.332-.924" }],
    ["path", { d: "m16 21-3.105-6.21" }],
    [
      "path",
      {
        d: "M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.07a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z",
      },
    ],
    ["path", { d: "m6.158 8.633 1.114 4.456" }],
    ["path", { d: "m8 21 3.105-6.21" }],
    ["circle", { cx: "12", cy: "13", r: "2" }],
  ],
  scales: [
    ["path", { d: "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }],
    ["path", { d: "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }],
    ["path", { d: "M7 21h10" }],
    ["path", { d: "M12 3v18" }],
    ["path", { d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" }],
  ],
  target: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["circle", { cx: "12", cy: "12", r: "6" }],
    ["circle", { cx: "12", cy: "12", r: "2" }],
  ],
  anchor: [
    ["path", { d: "M12 22V12" }],
    ["path", { d: "M5 12H2a10 10 0 0 0 20 0h-3" }],
    ["circle", { cx: "12", cy: "5", r: "3" }],
    ["path", { d: "M12 8v4" }],
  ],
  pickaxe: [
    ["path", { d: "M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912" }],
    [
      "path",
      {
        d: "M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393",
      },
    ],
    [
      "path",
      {
        d: "M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z",
      },
    ],
    [
      "path",
      {
        d: "M19.686 8.314a12.501 12.501 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319",
      },
    ],
  ],
  hourglass: [
    ["path", { d: "M5 22h14" }],
    ["path", { d: "M5 2h14" }],
    [
      "path",
      {
        d: "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22",
      },
    ],
    [
      "path",
      {
        d: "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2",
      },
    ],
  ],
  feather: [
    [
      "path",
      {
        d: "M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z",
      },
    ],
    ["path", { d: "M16 8 2 22" }],
    ["path", { d: "M17.5 15H9" }],
  ],
  map: [
    [
      "path",
      {
        d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",
      },
    ],
    ["path", { d: "M15 5.764v15" }],
    ["path", { d: "M9 3.236v15" }],
  ],
  megaphone: [
    ["path", { d: "m3 11 19-9v18L3 13" }],
    ["path", { d: "M11.6 16.8a3 3 0 1 1-5.8-1.6" }],
  ],
  ghost: [
    ["path", { d: "M9 10h.01" }],
    ["path", { d: "M15 10h.01" }],
    [
      "path",
      {
        d: "M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",
      },
    ],
  ],
  storm: [
    ["path", { d: "M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" }],
    ["path", { d: "m13 12-3 5h4l-3 5" }],
  ],
  potion: [
    [
      "path",
      {
        d: "M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",
      },
    ],
    ["path", { d: "M8.5 2h7" }],
    ["path", { d: "M7 16h10" }],
  ],
  frame: [
    ["rect", { x: "2", y: "2", width: "20", height: "20", rx: "2" }],
    ["rect", { x: "6", y: "6", width: "12", height: "12", rx: "1" }],
  ],
  fortress: [
    ["path", { d: "M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z" }],
    ["path", { d: "M18 11V4H6v7" }],
    ["path", { d: "M15 22v-4a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3v4" }],
    ["path", { d: "M2 11h20" }],
    ["path", { d: "M6 7h2" }],
    ["path", { d: "M18 7h-2" }],
    ["path", { d: "M11 7h2" }],
  ],
  axe: [
    ["path", { d: "M12 2v20" }],
    ["path", { d: "M12 5c3 0 6 2 6 5s-3 5-6 5" }],
    ["path", { d: "M12 5c-3 0-6 2-6 5s3 5 6 5" }],
  ],
  bow: [
    ["path", { d: "M6 3c5 0 9 4 9 9s-4 9-9 9" }],
    ["line", { x1: "6", y1: "3", x2: "6", y2: "21" }],
    ["path", { d: "M2 12h18" }],
    ["path", { d: "M18 10l5 2-5 2" }],
  ],
  dagger: [
    ["path", { d: "M12 22v-5" }],
    ["path", { d: "M9 17h6" }],
    ["path", { d: "M12 17V2" }],
    ["path", { d: "M10 17 12 2l2 15z" }],
  ],
  spear: [
    ["line", { x1: "12", y1: "8", x2: "12", y2: "22" }],
    ["path", { d: "M12 2l-2 6h4z" }],
  ],
  baton: [
    ["path", { d: "M18 6l-8 8" }],
    ["path", { d: "M10 14l-4 4" }],
    ["path", { d: "M8 12l4 4" }],
    ["path", { d: "M5 19c-2 2-4 0-2-2" }],
  ],
  chisel: [
    ["path", { d: "M12 2v8" }],
    ["path", { d: "M10 2h4v6h-4z" }],
    ["path", { d: "M10 8l-2 12h8l-2-12" }],
  ],
  whetstone: [
    [
      "path",
      {
        d: "M6 4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z",
      },
    ],
    ["path", { d: "M8 10l4-4" }],
    ["path", { d: "M12 16l4-4" }],
  ],
  helm: [
    [
      "path",
      {
        d: "M12 2a8 8 0 0 0-8 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a8 8 0 0 0-8-8z",
      },
    ],
    ["path", { d: "M12 12v4" }],
    ["path", { d: "M8 12h8" }],
    ["path", { d: "M4 10h16" }],
  ],
  knight: [
    ["path", { d: "M7 21h10" }],
    [
      "path",
      { d: "M9 21v-4l-2-3v-3c0-3 2-6 5-6h1c2 0 4 1 4 3 0 2-2 3-3 4l-1 2v7" },
    ],
    ["path", { d: "M11 5l-2-3 2 1" }],
  ],
  wall: [
    ["path", { d: "M2 4h20" }],
    ["path", { d: "M2 12h20" }],
    ["path", { d: "M2 20h20" }],
    ["path", { d: "M8 4v8" }],
    ["path", { d: "M16 4v8" }],
    ["path", { d: "M12 12v8" }],
  ],
  gauntlet: [
    ["path", { d: "M6 14v8h12v-8" }],
    ["path", { d: "M6 14c0-3 2-4 2-8s2-4 4-4 4 0 4 4 2 1 2 8" }],
    ["path", { d: "M8 14v-4" }],
    ["path", { d: "M12 14v-5" }],
    ["path", { d: "M16 14v-4" }],
  ],
  boots: [
    ["path", { d: "M6 4v10l-2 4v2h6v-2l-2-4V4z" }],
    ["path", { d: "M18 4v10l2 4v2h-6v-2l2-4V4z" }],
  ],
  cape: [
    ["path", { d: "M8 4h8" }],
    ["path", { d: "M8 4c-3 5-4 10-4 16h16c0-6-1-11-4-16" }],
    ["path", { d: "M12 4v16" }],
  ],
  mask: [
    ["path", { d: "M2 8c0 8 5 13 10 13s10-5 10-13-5-4-10-4-10 1-10 4Z" }],
    ["circle", { cx: "8", cy: "10", r: "1.5" }],
    ["circle", { cx: "16", cy: "10", r: "1.5" }],
    ["path", { d: "M10 16s1 1 2 1 2-1 2-1" }],
  ],
  cage: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
    ["path", { d: "M8 4v16" }],
    ["path", { d: "M12 4v16" }],
    ["path", { d: "M16 4v16" }],
    ["path", { d: "M12 2v2" }],
  ],
  chain: [
    ["path", { d: "M8 6h4a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z" }],
    ["path", { d: "M16 10h-4a4 4 0 0 0 0 8h4a4 4 0 0 0 0-8z" }],
  ],
  rune: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
    ["path", { d: "M9 8l7 9" }],
    ["path", { d: "M16 13l-6 4" }],
    ["path", { d: "M13 7l-4 5 4 1" }],
  ],
  beacon: [
    ["path", { d: "M10 22L12 8l2 14" }],
    ["path", { d: "M8 22h8" }],
    ["path", { d: "M10 8h4v4h-4z" }],
    ["path", { d: "M12 2v2" }],
    ["path", { d: "M7 4l2 2" }],
    ["path", { d: "M17 4l-2 2" }],
  ],
  prism: [
    ["path", { d: "M12 2L2 20h20z" }],
    ["path", { d: "M12 2v18" }],
  ],
  seal: [
    ["circle", { cx: "12", cy: "10", r: "6" }],
    ["path", { d: "M9 15v7l3-2 3 2v-7" }],
    ["path", { d: "M12 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" }],
  ],
  anvil: [
    ["path", { d: "M6 10h12c2 0 4-2 4-4H2c0 2 2 4 4 4z" }],
    ["path", { d: "M9 10v6" }],
    ["path", { d: "M15 10v6" }],
    ["path", { d: "M5 16h14a2 2 0 0 1 2 2v2H3v-2a2 2 0 0 1 2-2z" }],
  ],
  saw: [
    ["path", { d: "M3 14c0-2 2-4 4-4h1v6H7c-2 0-4-2-4-4z" }],
    ["path", { d: "M8 10h14l-2 8H8" }],
    ["path", { d: "M8 18l1.5-3 1.5 3 1.5-3 1.5 3 1.5-3 1.5 3 1.5-3 1.5 3" }],
  ],
  forge: [
    ["path", { d: "M4 22h16" }],
    ["path", { d: "M6 22V6a6 6 0 0 1 12 0v16" }],
    ["path", { d: "M8 22v-8h8v8" }],
    ["path", { d: "M12 18v4" }],
  ],
  kiln: [
    ["path", { d: "M4 22h16" }],
    ["path", { d: "M5 22v-10a7 7 0 0 1 14 0v10" }],
    ["path", { d: "M8 16h8" }],
    ["path", { d: "M10 12h4" }],
  ],
  bellows: [
    ["path", { d: "M12 21l-4-8a6 6 0 1 1 8 0z" }],
    ["path", { d: "M10 3l-2-2" }],
    ["path", { d: "M14 3l2-2" }],
    ["path", { d: "M11 21v2h2v-2" }],
  ],
  lathe: [
    ["path", { d: "M2 20h20" }],
    ["path", { d: "M4 16h16v4H4z" }],
    ["path", { d: "M4 10h4v6H4z" }],
    ["path", { d: "M16 12h2v4h-2z" }],
    ["path", { d: "M8 13h8" }],
  ],
  mold: [
    ["path", { d: "M4 12h16" }],
    ["path", { d: "M6 12V8h12v4" }],
    ["path", { d: "M6 12v4h12v-4" }],
    ["path", { d: "M10 8V4h4v4" }],
  ],
  grinder: [
    ["path", { d: "M8 20h8v2H8z" }],
    ["path", { d: "M10 14h4v6h-4z" }],
    ["circle", { cx: "6", cy: "14", r: "4" }],
    ["circle", { cx: "18", cy: "14", r: "4" }],
    ["path", { d: "M6 14h12" }],
  ],
  stencil: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
    ["path", { d: "M12 8l-3 8" }],
    ["path", { d: "M12 8l3 8" }],
    ["path", { d: "M10.5 13h3" }],
  ],
  wire: [
    ["path", { d: "M8 4h8v16H8z" }],
    ["path", { d: "M6 4h12" }],
    ["path", { d: "M6 20h12" }],
    ["path", { d: "M16 12c4 0 4 4 0 4s-4 4 0 4h4" }],
  ],
  tally: [
    ["path", { d: "M6 6v12" }],
    ["path", { d: "M10 6v12" }],
    ["path", { d: "M14 6v12" }],
    ["path", { d: "M18 6v12" }],
    ["path", { d: "M4 14l16-4" }],
  ],
  level: [
    ["rect", { x: "2", y: "8", width: "20", height: "8", rx: "2" }],
    ["circle", { cx: "12", cy: "12", r: "2" }],
    ["path", { d: "M10 10v4" }],
    ["path", { d: "M14 10v4" }],
  ],
  drill: [
    ["path", { d: "M4 6h6v12H4z" }],
    ["path", { d: "M10 8h6v4h-6" }],
    ["path", { d: "M16 9h4l2 1-2 1h-4" }],
    ["path", { d: "M8 14h-2" }],
  ],
  chalk: [
    ["rect", { x: "8", y: "4", width: "8", height: "14", rx: "2" }],
    ["path", { d: "M8 18h8v2H8z" }],
    ["path", { d: "M4 22h16" }],
  ],
  wheel: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["circle", { cx: "12", cy: "12", r: "3" }],
    ["path", { d: "M12 2v7" }],
    ["path", { d: "M12 15v7" }],
    ["path", { d: "M2 12h7" }],
    ["path", { d: "M15 12h7" }],
    ["path", { d: "M4.93 4.93l4.95 4.95" }],
    ["path", { d: "M14.12 14.12l4.95 4.95" }],
    ["path", { d: "M19.07 4.93l-4.95 4.95" }],
    ["path", { d: "M9.88 14.12l-4.95 4.95" }],
  ],
  strings: [
    ["path", { d: "M12 2v10" }],
    [
      "path",
      {
        d: "M9 12c-2 0-3 2-3 4s1 2 1 3-1 1-1 3 2 4 6 4 6-1 6-4-1-2-1-3 1-1 1-3-1-4-3-4",
      },
    ],
    ["path", { d: "M10 4h4" }],
  ],
  ram: [
    ["path", { d: "M4 10h14v4H4z" }],
    ["path", { d: "M18 10l4 2-4 2z" }],
    ["path", { d: "M6 4v6" }],
    ["path", { d: "M14 4v6" }],
    ["path", { d: "M2 4h20" }],
  ],
  mirror: [
    ["ellipse", { cx: "12", cy: "9", rx: "6", ry: "7" }],
    ["path", { d: "M12 16v6" }],
    ["path", { d: "M10 22h4" }],
    ["path", { d: "M9 6l3 3" }],
  ],
  broom: [
    ["path", { d: "M12 2v12" }],
    ["path", { d: "M8 14h8l2 6H6z" }],
  ],
  pin: [
    ["path", { d: "M12 17v5" }],
    [
      "path",
      {
        d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z",
      },
    ],
  ],
  ruler: [
    ["rect", { width: "20", height: "10", x: "2", y: "7", rx: "2" }],
    ["path", { d: "M6 7v4" }],
    ["path", { d: "M10 7v7" }],
    ["path", { d: "M14 7v4" }],
    ["path", { d: "M18 7v4" }],
  ],
  wrench: [
    [
      "path",
      {
        d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
      },
    ],
  ],
  clay: [
    ["path", { d: "M6 20h12l-2 2H8z" }],
    ["path", { d: "M8 20c0-6 4-8 4-12s4 6 4 12z" }],
  ],
  needle: [
    ["path", { d: "M12 2L11 20l1 2 1-2L12 2z" }],
    ["path", { d: "M12 6v2" }],
    ["path", { d: "M12 8s4 4 4 8-4 6-4 6" }],
  ],
  cabinet: [
    ["rect", { x: "4", y: "2", width: "16", height: "20", rx: "1" }],
    ["path", { d: "M12 2v20" }],
    ["path", { d: "M10 12v2" }],
    ["path", { d: "M14 12v2" }],
  ],
  coin: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["circle", { cx: "12", cy: "12", r: "6" }],
    ["circle", { cx: "12", cy: "12", r: "2" }],
  ],
  wings: [
    ["path", { d: "M12 10c-3-6-10-6-10-2s4 6 10 10" }],
    ["path", { d: "M12 10c3-6 10-6 10-2s-4 6-10 10" }],
  ],
  treasure: [
    ["path", { d: "M4 10c0-4 3-6 8-6s8 2 8 6" }],
    ["rect", { x: "4", y: "10", width: "16", height: "10", rx: "1" }],
    ["circle", { cx: "12", cy: "14", r: "2" }],
    ["path", { d: "M8 10v10" }],
    ["path", { d: "M16 10v10" }],
  ],
};

ICONS.harddrive = ICONS.storage;
ICONS.gear = ICONS.settings;
ICONS.torch = ICONS.flame;
ICONS.fire = ICONS.flame;
ICONS.banner = ICONS.flag;
ICONS.horn = ICONS.megaphone;
ICONS.quill = ICONS.feather;
ICONS.scale = ICONS.scales;
ICONS.lightning = ICONS.zap;
ICONS.crystal = ICONS.gem;
ICONS.db = ICONS.database;
ICONS.knight = ICONS.shield;
ICONS.timer = ICONS.clock;
ICONS.blade = ICONS.sword;
ICONS.ledger = ICONS.tome;
ICONS.blueprint = ICONS.map;
ICONS.lens = ICONS.search;
ICONS.dye = ICONS.potion;
ICONS.web = ICONS.globe;
ICONS.diagram = ICONS.network;

export type LucideIconNode = IconNode;

export function getLucideIcon(name: string): IconNode | null {
  return ICONS[name.toLowerCase()] ?? null;
}

const LUCIDE_VIEWBOX = 24;
const ICON_SIZE_RATIO = 0.65;

export function renderLucideIconOnGroup(
  group: Konva.Group,
  nodes: LucideIconNode,
  elementSize: number,
  color: string,
  opacity: number,
): void {
  const targetSize = elementSize * ICON_SIZE_RATIO;
  const scale = targetSize / LUCIDE_VIEWBOX;
  const offset = -targetSize / 2;

  const iconGroup = new Konva.Group({
    x: offset,
    y: offset,
    scaleX: scale,
    scaleY: scale,
    listening: false,
    opacity,
  });

  const commonStroke = {
    stroke: color,
    strokeWidth: 2,
    lineCap: "round" as const,
    lineJoin: "round" as const,
  };

  for (const [tag, attrs] of nodes) {
    switch (tag) {
      case "path":
        iconGroup.add(
          new Konva.Path({
            data: attrs.d,
            fillEnabled: false,
            ...commonStroke,
          }),
        );
        break;
      case "circle":
        iconGroup.add(
          new Konva.Circle({
            x: Number(attrs.cx),
            y: Number(attrs.cy),
            radius: Number(attrs.r),
            fillEnabled: false,
            ...commonStroke,
          }),
        );
        break;
      case "ellipse":
        iconGroup.add(
          new Konva.Ellipse({
            x: Number(attrs.cx),
            y: Number(attrs.cy),
            radiusX: Number(attrs.rx),
            radiusY: Number(attrs.ry),
            fillEnabled: false,
            ...commonStroke,
          }),
        );
        break;
      case "rect":
        iconGroup.add(
          new Konva.Rect({
            x: Number(attrs.x ?? 0),
            y: Number(attrs.y ?? 0),
            width: Number(attrs.width),
            height: Number(attrs.height),
            cornerRadius: Number(attrs.rx ?? attrs.ry ?? 0),
            fillEnabled: false,
            ...commonStroke,
          }),
        );
        break;
      case "line":
        iconGroup.add(
          new Konva.Line({
            points: [
              Number(attrs.x1),
              Number(attrs.y1),
              Number(attrs.x2),
              Number(attrs.y2),
            ],
            ...commonStroke,
          }),
        );
        break;
      case "polyline":
      case "polygon": {
        const pts = attrs.points
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        iconGroup.add(
          new Konva.Line({
            points: pts,
            closed: tag === "polygon",
            fillEnabled: false,
            ...commonStroke,
          }),
        );
        break;
      }
    }
  }

  group.add(iconGroup);
}
