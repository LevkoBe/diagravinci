import type { ElementType } from "../domain/models/Element";

interface SvgConfig {
  data: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
}

export const ELEMENT_SVGS: Record<ElementType, SvgConfig> = {
  object: {
    data: "M126 8H142.25C153.848 8 163.25 17.402 163.25 29V45.25C163.25 45.25 163.25 82.5 197 82.5C163.25 82.5 163.25 119.75 163.25 119.75V136C163.25 147.598 153.848 157 142.25 157H126M71 157H54.75C43.152 157 33.75 147.598 33.75 136V119.75C33.75 119.75 33.75 82.5 0 82.5C33.75 82.5 33.75 45.25 33.75 45.25V29C33.75 17.402 43.152 8 54.75 8H71",
    viewBoxWidth: 197,
    viewBoxHeight: 165,
  },
  state: {
    data: "M128.25 8H165.5V157H128.25M45.25 157H8V8H45.25",
    viewBoxWidth: 173,
    viewBoxHeight: 165,
  },
  function: {
    data: "M184.728 2.262C200 22.137 200 49.797 184.728 69.671M15.074 69.671C-0.199 49.797 -0.199 22.137 15.074 2.262",
    viewBoxWidth: 200,
    viewBoxHeight: 72,
  },
  flow: {
    data: "M5 6L80 80.5L5 155M128 6L203 80.5L128 155",
    viewBoxWidth: 214,
    viewBoxHeight: 161,
  },
  choice: {
    data: "M75 155L0 80.5L75 6M147 155L222 80.5L147 6",
    viewBoxWidth: 222,
    viewBoxHeight: 161,
  },
};

export const BASE_SIZE = 60;
export const STROKE_WIDTH = 10;
export const SELECTED_STROKE_WIDTH = 15;
