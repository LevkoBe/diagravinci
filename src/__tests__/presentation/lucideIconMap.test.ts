import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Konva from "konva";
import {
  getLucideIcon,
  renderLucideIconOnGroup,
  type LucideIconNode,
} from "../../presentation/components/rendering/elements/lucideIconMap";
import { KonvaTestHelper } from "../utils";

describe("getLucideIcon", () => {
  it("returns nodes for a known icon (database)", () => {
    const nodes = getLucideIcon("database");
    expect(nodes).not.toBeNull();
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes!.length).toBeGreaterThan(0);
  });

  it("returns nodes for a known icon (server)", () => {
    expect(getLucideIcon("server")).not.toBeNull();
  });

  it("returns nodes for a known icon (user)", () => {
    expect(getLucideIcon("user")).not.toBeNull();
  });

  it("returns null for unknown icon name", () => {
    expect(getLucideIcon("not_a_real_icon_xyz")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(getLucideIcon("DATABASE")).not.toBeNull();
    expect(getLucideIcon("Database")).not.toBeNull();
    expect(getLucideIcon("database")).not.toBeNull();
  });

  it("harddrive alias resolves to storage icon", () => {
    const hardDrive = getLucideIcon("harddrive");
    const storage = getLucideIcon("storage");
    expect(hardDrive).not.toBeNull();
    expect(hardDrive).toBe(storage);
  });
});

describe("renderLucideIconOnGroup", () => {
  let helper: KonvaTestHelper;

  beforeEach(() => {
    helper = new KonvaTestHelper();
    helper.createStage();
  });

  afterEach(() => {
    helper.cleanup();
  });

  it("adds a child group to the parent group", () => {
    const nodes = getLucideIcon("database")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 1);
    expect(group.getChildren().length).toBe(1);
    expect(group.getChildren()[0]).toBeInstanceOf(Konva.Group);
  });

  it("renders path nodes (database icon)", () => {
    const nodes = getLucideIcon("database")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const paths = iconGroup.getChildren().filter((c) => c instanceof Konva.Path);
    expect(paths.length).toBeGreaterThan(0);
  });

  it("renders ellipse nodes (database icon)", () => {
    const nodes = getLucideIcon("database")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const ellipses = iconGroup.getChildren().filter((c) => c instanceof Konva.Ellipse);
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it("renders rect nodes (server icon)", () => {
    const nodes = getLucideIcon("server")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const rects = iconGroup.getChildren().filter((c) => c instanceof Konva.Rect);
    expect(rects.length).toBeGreaterThan(0);
  });

  it("renders line nodes (server icon)", () => {
    const nodes = getLucideIcon("server")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const lines = iconGroup.getChildren().filter((c) => c instanceof Konva.Line);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("renders circle nodes (user icon)", () => {
    const nodes = getLucideIcon("user")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const circles = iconGroup.getChildren().filter((c) => c instanceof Konva.Circle);
    expect(circles.length).toBeGreaterThan(0);
  });

  it("renders polyline nodes from synthetic icon", () => {
    const syntheticNodes: LucideIconNode = [
      ["polyline", { points: "1 2 3 4 5 6" }],
    ];
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, syntheticNodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const lines = iconGroup.getChildren().filter((c) => c instanceof Konva.Line);
    expect(lines.length).toBe(1);
  });

  it("renders polygon nodes from synthetic icon", () => {
    const syntheticNodes: LucideIconNode = [
      ["polygon", { points: "12 2 22 20 2 20" }],
    ];
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, syntheticNodes, 60, "#000", 1);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    const lines = iconGroup.getChildren().filter((c) => c instanceof Konva.Line);
    expect(lines.length).toBe(1);
  });

  it("applies opacity to icon group", () => {
    const nodes = getLucideIcon("user")!;
    const group = new Konva.Group();
    renderLucideIconOnGroup(group, nodes, 60, "#000", 0.5);
    const iconGroup = group.getChildren()[0] as Konva.Group;
    expect(iconGroup.opacity()).toBe(0.5);
  });

  it("scales icon group based on element size", () => {
    const nodes = getLucideIcon("user")!;
    const groupSmall = new Konva.Group();
    const groupLarge = new Konva.Group();
    renderLucideIconOnGroup(groupSmall, nodes, 30, "#000", 1);
    renderLucideIconOnGroup(groupLarge, nodes, 120, "#000", 1);
    const scaleSmall = (groupSmall.getChildren()[0] as Konva.Group).scaleX();
    const scaleLarge = (groupLarge.getChildren()[0] as Konva.Group).scaleX();
    expect(scaleLarge).toBeGreaterThan(scaleSmall);
  });
});
