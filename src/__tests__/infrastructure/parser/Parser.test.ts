import { describe, it, expect } from "vitest";
import { Lexer } from "../../../infrastructure/parser/Lexer";
import { Parser } from "../../../infrastructure/parser/Parser";

describe("Parser", () => {
  const parse = (input: string) => {
    const tokens = new Lexer(input).tokenize();
    return new Parser(tokens).parse();
  };

  it("should parse a single identifier as element", () => {
    const model = parse("player");
    expect(Object.values(model.elements).length).toBe(1);
    const elem = Array.from(Object.values(model.elements))[0];
    expect(elem.id).toBe("player{}");
    expect(elem.type).toBe("object");
  });

  it("should parse element with wrapper", () => {
    const model = parse("player{}");
    expect(Object.values(model.elements).length).toBe(1);
    const elem = Array.from(Object.values(model.elements))[0];
    expect(elem.id).toBe("player{}");
    expect(elem.type).toBe("object");
  });

  it("should parse a collection", () => {
    const model = parse("players[]");
    expect(Object.values(model.elements).length).toBe(1);
    const elem = Array.from(Object.values(model.elements))[0];
    expect(elem.id).toBe("players[]");
    expect(elem.type).toBe("collection");
  });

  it("should parse element with properties", () => {
    const model = parse("player{username password}");
    expect(Object.values(model.elements).length).toBe(3);

    const [player, username, password] = Array.from(
      Object.values(model.elements),
    );
    expect(player.id).toBe("player{}");
    expect(player.type).toBe("object");
    expect(player.childIds).toContain(username.id);
    expect(player.childIds).toContain(password.id);
  });

  it("should parse element with properties and methods", () => {
    const model = parse("player{nick{} health items[] walk() decide<>}");
    expect(Object.values(model.elements).length).toBe(6);

    const [player, nick, health, items, walk, decide] = Array.from(
      Object.values(model.elements),
    );
    expect(player.childIds).toContain(nick.id);
    expect(player.childIds).toContain(health.id);
    expect(player.childIds).toContain(items.id);
    expect(player.childIds).toContain(walk.id);
    expect(player.childIds).toContain(decide.id);

    expect(nick.type).toBe("object");
    expect(health.type).toBe("object");
    expect(items.type).toBe("collection");
    expect(walk.type).toBe("function");
    expect(decide.type).toBe("choice");
  });

  it("should parse collection with elements", () => {
    const model = parse("players[player1 player2]");
    expect(Object.values(model.elements).length).toBe(3);

    const [player, username, password] = Array.from(
      Object.values(model.elements),
    );
    expect(player.childIds).toContain(username.id);
    expect(player.childIds).toContain(password.id);
    expect(player.id).toBe("players[]");
    expect(player.type).toBe("collection");
  });

  it("should parse a few elements", () => {
    const model = parse("player username password");
    expect(Object.values(model.elements).length).toBe(3);

    const [player, username, password] = Array.from(
      Object.values(model.elements),
    );
    expect(player.childIds.length).toBe(0);
    expect(username.childIds.length).toBe(0);
    expect(password.childIds.length).toBe(0);
  });

  it("should parse nested elements", () => {
    const model = parse("game{player{username password} world{location}}");
    expect(Object.values(model.elements).length).toBe(6);
    const [game, player, username, password, world, location] = Array.from(
      Object.values(model.elements),
    );
    expect(game.childIds).toContain(player.id);
    expect(game.childIds).toContain(world.id);
    expect(player.childIds).toContain(username.id);
    expect(player.childIds).toContain(password.id);
    expect(world.childIds).toContain(location.id);
  });

  it("should parse different-typed nesting", () => {
    const model = parse("game{play[walk fight] start(step1 step2)}");
    expect(Object.values(model.elements).length).toBe(7);
    const [game, play, walk, fight, start, step1, step2] = Array.from(
      Object.values(model.elements),
    );
    expect(game.childIds).toContain(play.id);
    expect(game.childIds).toContain(start.id);
    expect(play.childIds).toContain(walk.id);
    expect(play.childIds).toContain(fight.id);
    expect(start.childIds).toContain(step1.id);
    expect(start.childIds).toContain(step2.id);
    expect(play.type).toBe("collection");
    expect(walk.type).toBe("object");
    expect(fight.type).toBe("object");
    expect(start.type).toBe("function");
    expect(step1.type).toBe("object");
    expect(step2.type).toBe("object");
  });

  it("should parse decision tree", () => {
    const model = parse(
      "<start<if1 if2 else1> op1 op2 op3<if3 if4 if5> op4 op5 op6>",
    );
    expect(Object.values(model.elements).length).toBe(14);
    const [, start, if1, if2, else1, , , op3, if3, if4, if5] = Array.from(
      Object.values(model.elements),
    );
    expect(start.childIds).toContain(if1.id);
    expect(start.childIds).toContain(if2.id);
    expect(start.childIds).toContain(else1.id);
    expect(op3.childIds).toContain(if3.id);
    expect(op3.childIds).toContain(if4.id);
    expect(op3.childIds).toContain(if5.id);
    const elements = Array.from(Object.values(model.elements));
    expect(elements[0].type).toBe("choice");
    expect(start.type).toBe("choice");
    expect(op3.type).toBe("choice");
    expect(if1.type).toBe("object");
    expect(if2.type).toBe("object");
    expect(else1.type).toBe("object");
    expect(if3.type).toBe("object");
    expect(if4.type).toBe("object");
    expect(if5.type).toBe("object");
  });

  it("should parse simple arrow relationship", () => {
    const model = parse("player-->world");
    expect(Object.values(model.relationships).length).toBe(1);
    expect(Object.values(model.elements).length).toBe(2);

    const rel = Array.from(Object.values(model.relationships))[0];
    const [player, world] = Array.from(Object.values(model.elements));
    expect(rel.source).toBe(player.id);
    expect(rel.target).toBe(world.id);
  });

  it("should parse different relationships", () => {
    const model = parse("player-->world--|>item--*player--o item");
    expect(Object.values(model.relationships).length).toBe(4);
    expect(Object.values(model.elements).length).toBe(3);
  });

  it("should handle unclosed wrappers", () => {
    const model = parse("world{kingdom {castle");
    expect(Object.values(model.elements).length).toBe(3);
    const [world, kingdom, castle] = Array.from(Object.values(model.elements));
    expect(world.childIds).toContain(kingdom.id);
    expect(kingdom.childIds).toContain(castle.id);
  });

  it("should handle unopened wrappers", () => {
    const model = parse("world} kingdom} castle}");
    expect(Object.values(model.elements).length).toBe(1);
  });

  it("should handle improper wrappers", () => {
    const model = parse("world{kingdom) castle]");
    expect(Object.values(model.elements).length).toBe(3);
    const [world, kingdom, castle] = Array.from(Object.values(model.elements));
    expect(world.childIds).toContain(kingdom.id);
    expect(world.childIds).toContain(castle.id);
  });

  it("should parse relationship with label", () => {
    const model = parse("player o--owns-- tool");
    expect(Object.values(model.relationships).length).toBe(1);
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.label).toBe("owns");

    expect(Object.values(model.elements).length).toBe(2);
    const [player, tool] = Array.from(Object.values(model.elements));
    expect(rel.source).toBe(tool.id);
    expect(rel.target).toBe(player.id);
  });

  it("should parse composition relationship", () => {
    const model = parse("whole *-- part");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.type).toBe("--*");
    expect(rel.source).toBe("part{}");
    expect(rel.target).toBe("whole{}");
  });

  it("should parse aggregation relationship", () => {
    const model = parse("container o-- item");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.type).toBe("--o");
    expect(rel.source).toBe("item{}");
    expect(rel.target).toBe("container{}");
  });

  it("should parse implementation relationship", () => {
    const model = parse("class ..|> interface");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.type).toBe("..|>");
  });

  it("should parse inheritance relationship", () => {
    const model = parse("child --|> parent");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.type).toBe("--|>");
  });

  it("should handle whitespace-only input", () => {
    const model = parse("   \n  \t  \n  ");
    expect(Object.values(model.elements).length).toBe(0);
    expect(Object.values(model.relationships).length).toBe(0);
  });

  it("should parse gibberish structure gracefully", () => {
    const model = parse("}{{{}}}{}{[]]()");
    expect(Object.values(model.elements).length).toBe(0);
    expect(Object.values(model.relationships).length).toBe(0);
  });

  it("should handle empty input", () => {
    const model = parse("");
    expect(Object.values(model.elements).length).toBe(0);
    expect(Object.values(model.relationships).length).toBe(0);
  });

  it("should parse relationship between nested elements", () => {
    const model = parse("game{player-->world}");
    expect(Object.values(model.elements).length).toBe(3);
    const [game, player, world] = Array.from(Object.values(model.elements));
    expect(game.childIds).toContain(player.id);
    expect(game.childIds).toContain(world.id);
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.source).toBe("game{}.player{}");
    expect(rel.target).toBe("game{}.world{}");
  });

  it("should preserve element order", () => {
    const model = parse("first second third");
    expect(Object.values(model.elements).length).toBe(3);
    const [first, second, third] = Array.from(Object.values(model.elements));
    expect(first.id).toBe("first{}");
    expect(second.id).toBe("second{}");
    expect(third.id).toBe("third{}");
  });

  it("should parse consecutive relationships", () => {
    const model = parse("a-->b-->c");
    expect(Object.values(model.elements).length).toBe(3);
    expect(Object.values(model.relationships).length).toBe(2);
    const [a, b, c] = Array.from(Object.values(model.elements));
    const [rel1, rel2] = Array.from(Object.values(model.relationships));
    expect(rel1.source).toBe(a.id);
    expect(rel1.target).toBe(b.id);
    expect(rel2.source).toBe(b.id);
    expect(rel2.target).toBe(c.id);
  });

  it("should parse semi-complex game architecture", () => {
    const model = parse(`
      player{
        username
        rank
        stats
        inventory
      }
      
      match{
        players[player]
        map
        mode
      }
      
      gameSession{
        state
        events
        score
      }
      
      match o-- player
      match *-- gameSession
      player o-- inventory
    `);
    expect(Object.values(model.elements).length).toBe(13);
    const [
      player,
      usrname,
      rank,
      stats,
      inventory,
      match,
      players,
      map,
      mode,
      gameSession,
      state,
      events,
      score,
    ] = Array.from(Object.values(model.elements));
    expect(player.childIds).toContain(usrname.id);
    expect(player.childIds).toContain(rank.id);
    expect(player.childIds).toContain(stats.id);
    expect(player.childIds).toContain(inventory.id);

    expect(match.childIds).toContain(players.id);
    expect(match.childIds).toContain(map.id);
    expect(match.childIds).toContain(mode.id);

    expect(gameSession.childIds).toContain(state.id);
    expect(gameSession.childIds).toContain(events.id);
    expect(gameSession.childIds).toContain(score.id);

    expect(Object.values(model.relationships).length).toBe(3);
    const [rel1, rel2, rel3] = Array.from(Object.values(model.relationships));
    expect(rel1.source).toBe(player.id);
    expect(rel1.target).toBe(match.id);
    expect(rel1.type).toBe("--o");
    expect(rel2.source).toBe(gameSession.id);
    expect(rel2.target).toBe(match.id);
    expect(rel2.type).toBe("--*");
    expect(rel3.source).toBe(inventory.id);
    expect(rel3.target).toBe(player.id);
    expect(rel3.type).toBe("--o");
  });

  it("should merge double element definition", () => {
    const model = parse("player{username} player{password}");
    expect(Object.values(model.elements).length).toBe(3);
    const [player, username, password] = Array.from(
      Object.values(model.elements),
    );
    expect(player.childIds).toContain(username.id);
    expect(player.childIds).toContain(password.id);
  });

  it("should handle relationship with anonymous element", () => {
    const model = parse("world-->{}");
    expect(Object.values(model.elements).length).toBe(2);
    const [world, anon] = Array.from(Object.values(model.elements));
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.source).toBe(world.id);
    expect(rel.target).toBe(anon.id);
  });

  it("should handle relationship with root element", () => {
    const model = parse("-->world");
    expect(Object.values(model.elements).length).toBe(1);
    const world = Array.from(Object.values(model.elements))[0];
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.source).toBe(model.root.id);
    expect(rel.target).toBe(world.id);
  });

  it("should handle recursion", () => {
    const model = parse("a{b{a}}");
    expect(Object.values(model.elements).length).toBe(2);
    const [a, b] = Array.from(Object.values(model.elements));
    expect(a.childIds).toContain(b.id);
    expect(b.childIds).toContain(a.id);
    expect(a.childIds).not.toContain(a.id);
  });

  it("should handle child duplicate", () => {
    const model = parse("a{b b}");
    expect(Object.values(model.elements).length).toBe(2);
    const [a, b] = Array.from(Object.values(model.elements));
    expect(a.childIds).toContain(b.id);
    expect(a.childIds.length).toBe(1);
  });

  it("should handle flow between elements", () => {
    const model = parse("player >emeralds> shop");
    expect(Object.values(model.elements).length).toBe(3);
    expect(model.root.childIds.length).toBe(2);
    const [player, emeralds, shop] = Array.from(Object.values(model.elements));
    expect(player.type).toBe("flow");
    expect(player.childIds).toContain(emeralds.id);
    expect(emeralds.type).toBe("object");
    expect(shop.type).toBe("object");
  });

  it("should handle io", () => {
    const model = parse(">input> step1() >intermediate> step2() >output>");
    expect(Object.values(model.elements).length).toBe(8);
    expect(model.root.childIds.length).toBe(5);
    const [flow1, input, step1, flow2, intermediate, step2, flow3, output] =
      Array.from(Object.values(model.elements));
    expect(flow1.type).toBe("flow");
    expect(input.type).toBe("object");
    expect(step1.type).toBe("function");
    expect(flow2.type).toBe("flow");
    expect(intermediate.type).toBe("object");
    expect(step2.type).toBe("function");
    expect(flow3.type).toBe("flow");
    expect(output.type).toBe("object");
  });

  it("should handle flow with arrow", () => {
    const model = parse("player -->>walk()> shop");
    expect(Object.values(model.elements).length).toBe(4);
    expect(model.root.childIds.length).toBe(3);
    const [player, flow, walk, shop] = Array.from(
      Object.values(model.elements),
    );
    expect(player.type).toBe("object");
    expect(flow.type).toBe("flow");
    expect(walk.type).toBe("function");
    expect(shop.type).toBe("object");
    const [rel1, rel2] = Array.from(Object.values(model.relationships));
    expect(rel1.source).toBe(player.id);
    expect(rel1.target).toBe(flow.id);
    expect(rel2.source).toBe(flow.id);
    expect(rel2.target).toBe(shop.id);
  });

  it("flow at end of line does not connect to next line", () => {
    const model = parse("f1()\n>>\nf2()");
    const rels = Object.values(model.relationships);
    const f1 = model.elements["f1()"];
    const f2 = model.elements["f2()"];
    expect(f1).toBeDefined();
    expect(f2).toBeDefined();
    expect(rels.every((r) => !(r.source === f1.id && r.target === f2.id))).toBe(
      true,
    );
    expect(rels.every((r) => r.target !== f2.id)).toBe(true);
  });

  it("flow on its own line does not connect backward to the preceding line either", () => {
    const model = parse("f1()\n>>\nf2()");
    const rels = Object.values(model.relationships);
    const f1 = model.elements["f1()"];
    expect(f1).toBeDefined();
    expect(rels.every((r) => r.source !== f1.id)).toBe(true);
    expect(rels).toHaveLength(0);
  });

  it("flow on the same line as its source still connects backward", () => {
    const model = parse("f1()>>");
    const rels = Object.values(model.relationships);
    const f1 = model.elements["f1()"];
    expect(f1).toBeDefined();
    expect(rels.some((r) => r.source === f1.id)).toBe(true);
  });

  it("function return type notation: func(input)>output>", () => {
    const model = parse("func(input)>output>");
    const func = model.elements["func()"];
    const output = model.elements["output{}"];
    expect(func?.type).toBe("function");
    expect(output?.type).toBe("object");
    const rels = Object.values(model.relationships);
    expect(rels.every((r) => r.target !== output.id)).toBe(true);
  });

  it("function with named flow output: f()named_out>out>", () => {
    const model = parse("f()named_out>out>");
    expect(Object.values(model.elements).length).toBe(3);
    const f = model.elements["f()"];
    const named_out = model.elements["named_out>>"];
    const out = model.elements["out{}"];
    expect(f?.type).toBe("function");
    expect(named_out?.type).toBe("flow");
    expect(named_out?.childIds).toContain("out{}");
    expect(out?.type).toBe("object");
    const rels = Object.values(model.relationships);
    expect(rels).toHaveLength(2);
    const fRel = rels.find(r => r.source === "f()");
    const outRel = rels.find(r => r.source === "named_out>>");
    expect(fRel?.target).toBe("named_out>>");
    expect(outRel?.target).toBe("_");
  });

  it("named flow with anonymous source: from{} >x> to produces 4 elements and 2 ..> relationships", () => {
    const model = parse("from{} >x> to");
    expect(Object.values(model.elements).length).toBe(4);
    const rels = Object.values(model.relationships);
    expect(rels).toHaveLength(2);
    expect(rels.every((r) => r.type === "..>")).toBe(true);
  });

  it("named flow with bare source: from named>x> to produces 4 elements and 2 ..> relationships", () => {
    const model = parse("from named>x> to");
    expect(Object.values(model.elements).length).toBe(4);
    const rels = Object.values(model.relationships);
    expect(rels).toHaveLength(2);
    expect(rels.every((r) => r.type === "..>")).toBe(true);
    const from = model.elements["from{}"];
    const named = model.elements["named>>"];
    const to = model.elements["to{}"];
    expect(from?.type).toBe("object");
    expect(named?.type).toBe("flow");
    expect(to?.type).toBe("object");
    expect(rels[0].source).toBe("from{}");
    expect(rels[0].target).toBe("named>>");
    expect(rels[1].source).toBe("named>>");
    expect(rels[1].target).toBe("to{}");
  });

  it("subsequent wrappers do not override the first type", () => {
    const model = parse("a[](){}");
    expect(model.elements["a[]"].type).toBe("collection");
  });

  it("should handle anonymity", () => {
    const model = parse("player-->{}-->X");
    expect(Object.values(model.elements).length).toBe(3);
    const [player, anon, x] = Array.from(Object.values(model.elements));
    expect(player.type).toBe("object");
    expect(anon.type).toBe("object");
    expect(x.type).toBe("object");
    const [rel1, rel2] = Array.from(Object.values(model.relationships));
    expect(rel1.source).toBe(player.id);
    expect(rel1.target).toBe(anon.id);
    expect(rel2.source).toBe(anon.id);
    expect(rel2.target).toBe(x.id);
  });

  it("should parse different anonymous elements", () => {
    const model = parse(
      "a-->[a1]-->b-->{b1}-->c-->(c1)-->d--><d1>-->e-->>e1>-->f",
    );
    expect(Object.values(model.elements).length).toBe(16);
    expect(model.root.childIds.length).toBe(11);
    expect(Object.values(model.relationships).length).toBe(10);
    const [
      a,
      anon1,
      a1,
      b,
      anon2,
      b1,
      c,
      anon3,
      c1,
      d,
      anon4,
      d1,
      e,
      anon5,
      e1,
      f,
    ] = Array.from(Object.values(model.elements));
    expect(a.type).toBe("object");
    expect(anon1.type).toBe("collection");
    expect(a1.type).toBe("object");
    expect(b.type).toBe("object");
    expect(anon2.type).toBe("object");
    expect(b1.type).toBe("object");
    expect(c.type).toBe("object");
    expect(anon3.type).toBe("function");
    expect(c1.type).toBe("object");
    expect(d.type).toBe("object");
    expect(anon4.type).toBe("choice");
    expect(d1.type).toBe("object");
    expect(e.type).toBe("object");
    expect(anon5.type).toBe("flow");
    expect(e1.type).toBe("object");
    expect(f.type).toBe("object");

    expect(anon1.childIds).toContain(a1.id);
    expect(anon2.childIds).toContain(b1.id);
    expect(anon3.childIds).toContain(c1.id);
    expect(anon4.childIds).toContain(d1.id);
    expect(anon5.childIds).toContain(e1.id);
    expect(anon1.childIds.length).toBe(1);
    expect(anon2.childIds.length).toBe(1);
    expect(anon3.childIds.length).toBe(1);
    expect(anon4.childIds.length).toBe(1);
    expect(anon5.childIds.length).toBe(1);
  });

  it("should ensure element and relationship uniqueness", () => {
    const model = parse("a --> b --> a --> b --> a a b *-- a");
    expect(Object.values(model.elements).length).toBe(2);
    expect(Object.values(model.relationships).length).toBe(3);
    const [a, b] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a{}");
    expect(b.id).toBe("b{}");
    const [rel1, rel2, rel3] = Array.from(Object.values(model.relationships));
    expect(rel1.source).toBe(a.id);
    expect(rel1.target).toBe(b.id);
    expect(rel1.type).toBe("-->");
    expect(rel2.source).toBe(b.id);
    expect(rel2.target).toBe(a.id);
    expect(rel2.type).toBe("-->");
    expect(rel3.source).toBe(a.id);
    expect(rel3.target).toBe(b.id);
    expect(rel3.type).toBe("--*");
  });

  it("should parse relationship of arbitrary length", () => {
    const model = parse(
      "a -- b a --- b a ----------------------- b a ------------------------ b",
    );
    expect(Object.values(model.elements).length).toBe(2);
    expect(Object.values(model.relationships).length).toBe(1);
    const [a, b] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a{}");
    expect(b.id).toBe("b{}");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.source).toBe(a.id);
  });

  it("should handle multilayer nesting properly", () => {
    const model = parse("a{{}}");
    expect(Object.values(model.elements).length).toBe(2);
    const [a, anon] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a{}");
    expect(a.childIds).toContain(anon.id);
    expect(a.childIds.length).toBe(1);
  });

  it("anonymous nested objects get unique ids: {{}}", () => {
    const model = parse("{{}}");
    const elements = Object.values(model.elements);
    expect(elements.length).toBe(2);
    const [outer, inner] = elements;
    expect(outer.id).not.toBe(inner.id);
    expect(outer.type).toBe("object");
    expect(inner.type).toBe("object");
    expect(outer.childIds).toContain(inner.id);
  });

  it("anonymous nested wrappers get unique ids: [()]", () => {
    const model = parse("[()]");
    const elements = Object.values(model.elements);
    expect(elements.length).toBe(2);
    const [outer, inner] = elements;
    expect(outer.id).not.toBe(inner.id);
    expect(outer.type).toBe("collection");
    expect(inner.type).toBe("function");
    expect(outer.childIds).toContain(inner.id);
  });

  it("anonymous elements across different scopes get unique ids: ||--{[]}", () => {
    const model = parse("||--{[]}");
    const elements = Object.values(model.elements);
    expect(elements.length).toBe(3);
    const ids = elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
    const state = elements.find((e) => e.type === "state");
    const obj = elements.find((e) => e.type === "object");
    const coll = elements.find((e) => e.type === "collection");
    expect(state).toBeDefined();
    expect(obj).toBeDefined();
    expect(coll).toBeDefined();
    expect(obj!.childIds).toContain(coll!.id);
  });

  it("should parse curried function (QUESTIONABLE)", () => {
    const model = parse("f(x)(y)(z)");
    expect(Object.values(model.elements).length).toBe(4);
    const [f, x, y, z] = Array.from(Object.values(model.elements));
    expect(f.id).toBe("f()");
    expect(f.type).toBe("function");
    expect(f.childIds).toContain(x.id);
    expect(f.childIds).toContain(y.id);
    expect(f.childIds).toContain(z.id);
    expect(x.type).toBe("object");
    expect(y.type).toBe("object");
    expect(z.type).toBe("object");
  });

  it("should parse other chainings", () => {
    const model = parse("f(a){b}[c]<d>");
    expect(Object.values(model.elements).length).toBe(5);
    const [f, a, b, c, d] = Array.from(Object.values(model.elements));
    expect(f.id).toBe("f()");
    expect(f.type).toBe("function");
    expect(f.childIds).toContain(a.id);
    expect(f.childIds).toContain(b.id);
    expect(f.childIds).toContain(c.id);
    expect(f.childIds).toContain(d.id);
    expect(a.type).toBe("object");
    expect(b.type).toBe("object");
    expect(c.type).toBe("object");
    expect(d.type).toBe("object");
  });

  it("should handle relationships inside and outside of scope", () => {
    const model = parse("a{-->b-->}");
    expect(Object.values(model.elements).length).toBe(2);
    expect(Object.values(model.relationships).length).toBe(2);
    const [a] = Array.from(Object.values(model.elements));
    const [rel1, rel2] = Object.values(model.relationships);
    expect(rel1.source).toBe(a.id);
    expect(rel1.target).toBe("a{}.b{}");
    expect(rel2.source).toBe("a{}.b{}");
    expect(rel2.target).toBe("_");
  });

  it("should handle deep nesting duplicates", () => {
    const model = parse("a{a{a{a{a}}}}");
    expect(Object.values(model.elements).length).toBe(1);
    const a = Array.from(Object.values(model.elements))[0];
    expect(a.id).toBe("a{}");
    expect(a.childIds).toContain(a.id);
  });

  it("should parse correctly complex nesting duplicates", () => {
    const model = parse("a{a b{a{a b c} b}} c{a{b}}");
    expect(Object.values(model.elements).length).toBe(3);
    const [a, b, c] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a{}");
    expect(b.id).toBe("b{}");
    expect(c.id).toBe("c{}");
    expect(a.childIds).toHaveLength(3);
    expect(a.childIds).toContain(a.id);
    expect(a.childIds).toContain(b.id);
    expect(a.childIds).toContain(c.id);
    expect(b.childIds).toHaveLength(2);
    expect(b.childIds).toContain(a.id);
    expect(b.childIds).toContain(b.id);
    expect(c.childIds).toHaveLength(1);
    expect(c.childIds).toContain(a.id);
  });
});

describe("Parser sessions", () => {
  const parse = (input: string) => {
    const tokens = new Lexer(input).tokenize();
    return new Parser(tokens).parse();
  };

  it("always pre-seeds a default session even without a !session directive", () => {
    const model = parse("a{}");
    const sessions = model.sessions ?? [];
    const def = sessions.find((s) => s.id === "default");
    expect(def).toBeDefined();
  });

  it("updates the pre-seeded default session from a !session id=default directive", () => {
    const model = parse(
      '!session  id=default  label="My Default"  selectors=foo:color',
    );
    const sessions = model.sessions ?? [];
    const def = sessions.find((s) => s.id === "default");
    expect(def).toBeDefined();
    expect(def!.label).toBe("My Default");
    expect(def!.groupModes["foo"]).toBe("color");
  });

  it("does not create duplicate default sessions when !session id=default is explicit", () => {
    const model = parse(
      "!session  id=default  label=Default  selectors=foo:color",
    );
    const defaults = (model.sessions ?? []).filter((s) => s.id === "default");
    expect(defaults.length).toBe(1);
  });

  it("parses multiple sessions including a non-default one", () => {
    const code =
      "!session  id=default  label=Default  selectors=s1:color\n" +
      "!session  id=remote  label=Remote  selectors=s1:dim,s2:color";
    const model = parse(code);
    const sessions = model.sessions ?? [];
    const ids = sessions.map((s) => s.id);
    expect(ids).toContain("default");
    expect(ids).toContain("remote");
  });

  it("parses all valid SelectorModes in a single session directive", () => {
    const model = parse(
      "!session  id=s1  label=S1  selectors=a:color,b:dim,c:hide,d:off",
    );
    const s1 = (model.sessions ?? []).find((s) => s.id === "s1");
    expect(s1).toBeDefined();
    expect(s1!.groupModes["a"]).toBe("color");
    expect(s1!.groupModes["b"]).toBe("dim");
    expect(s1!.groupModes["c"]).toBe("hide");
    expect(s1!.groupModes["d"]).toBe("off");
  });

  it("ignores !session without an id field", () => {
    const model = parse("!session  label=NoId");
    const sessions = model.sessions ?? [];
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe("default");
  });
});

describe("Parser edge cases", () => {
  const parse = (input: string) => {
    const tokens = new Lexer(input).tokenize();
    return new Parser(tokens).parse();
  };

  it("silently skips unknown characters like '=' between elements", () => {
    const model = parse("a = b");

    const ids = Object.keys(model.elements);
    expect(ids).toContain("a{}");
    expect(ids).toContain("b{}");
  });

  it("attaches a single flag to an element", () => {
    const model = parse("player:warn");
    const el = model.elements["player{}"];
    expect(el).toBeDefined();
    expect(el.flags).toEqual(["warn"]);
  });

  it("attaches multiple flags to an element", () => {
    const model = parse("db:critical:dim");
    const el = model.elements["db{}"];
    expect(el.flags).toEqual(["critical", "dim"]);
  });

  it("flags do not create sibling elements", () => {
    const model = parse("player:warn --> server");
    const ids = Object.keys(model.elements);
    expect(ids).not.toContain("warn");
    expect(ids).toContain("player{}");
    expect(ids).toContain("server{}");
  });

  it("migrates !atom and !rule directives to groups", () => {
    const code = "!atom  id=db  all=*.db.*\n!rule  id=royals  all_name=queen";
    const model = parse(code);
    const groups = model.groups ?? [];
    expect(groups.find((g) => g.id === "db")).toBeDefined();
    expect(groups.find((g) => g.id === "royals")).toBeDefined();
    expect(model.rules ?? []).toHaveLength(0);
  });

  it("migrates !selector directive to a group using the expression as rule", () => {
    const code = "!selector  name=warn  color=#f00  expression=services";
    const model = parse(code);
    const groups = model.groups ?? [];
    const g = groups.find((g) => g.id === "warn");
    expect(g).toBeDefined();
    expect(g!.color).toBe("#f00");
    expect(g!.regex).toBe("services");
    expect(model.selectors ?? []).toHaveLength(0);
  });

  it("migrates !selector with legacy combiner/formula fields to group rule", () => {
    const code = "!selector  name=old  color=#f00  combiner=1";
    const model = parse(code);
    const g = (model.groups ?? []).find((g) => g.id === "old");
    expect(g?.regex).toBe("1");
  });

  it("ignores !directive with unknown type", () => {
    const model = parse("!unknown foo=bar");
    expect(model.groups ?? []).toHaveLength(0);
  });

  it("ignores !selector directive missing name", () => {
    const model = parse("!selector path=*.db.*");
    expect(model.groups ?? []).toHaveLength(0);
  });

  it("deduplicates !selector directives with same name", () => {
    const model = parse(
      "!selector name=warn color=#f00 mode=color\n!selector name=warn color=#0f0 mode=dim",
    );
    const groups = model.groups ?? [];
    expect(groups.filter((g) => g.id === "warn")).toHaveLength(1);
    expect(groups.find((g) => g.id === "warn")?.color).toBe("#f00");
  });

  it("parses empty input without error", () => {
    const model = parse("");
    expect(Object.keys(model.elements)).toHaveLength(0);
  });

  it("parses redundant closing wrapper without error", () => {
    expect(() => parse("a } b")).not.toThrow();
  });

  it("throws when nesting depth exceeds MAX_NESTING_DEPTH", () => {
    const depth = 1002;
    const open = "a" + "{a".repeat(depth);
    expect(() => parse(open)).toThrow("Maximum parser nesting depth exceeded");
  });

  describe("relationship endpoint scoping", () => {
    it("does not add pre-existing target to container", () => {
      const model = parse("a() c()\nd{a a-->c}");
      expect(model.elements["d{}"].childIds).toEqual(["a()"]);
      expect(model.elements["d{}"].childIds).not.toContain("c()");
    });

    it("does not add pre-existing source to container", () => {
      const model = parse("a() c()\ne{c a-->c}");
      expect(model.elements["e{}"].childIds).toEqual(["c()"]);
      expect(model.elements["e{}"].childIds).not.toContain("a()");
    });

    it("does not add either pre-existing endpoint to container", () => {
      const model = parse("a() c()\nf{a-->c}");
      expect(model.elements["f{}"].childIds).toHaveLength(0);
    });

    it("explicit listing still pulls pre-existing element into container", () => {
      const model = parse("a() c()\nb{a c a-->c}");
      expect(model.elements["b{}"].childIds).toContain("a()");
      expect(model.elements["b{}"].childIds).toContain("c()");
    });

    it("creates new elements locally when they appear only in relationships", () => {
      const model = parse("f2{x-->y}");
      expect(model.elements["f2{}"].childIds).toContain("x{}");
      expect(model.elements["f2{}"].childIds).toContain("y{}");
    });

    it("stores local path for newly created relationship endpoints", () => {
      const model = parse("f2{x-->y}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("f2{}.x{}");
      expect(rels[0].target).toBe("f2{}.y{}");
    });

    it("stores bare id for pre-existing global relationship endpoints", () => {
      const model = parse("a() c()\nf{a-->c}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("a()");
      expect(rels[0].target).toBe("c()");
    });

    it("supports a-->b-->c chain with auto-creation", () => {
      const model = parse("g{a-->b-->c}");
      expect(model.elements["g{}"].childIds).toContain("a{}");
      expect(model.elements["g{}"].childIds).toContain("b{}");
      expect(model.elements["g{}"].childIds).toContain("c{}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(2);
    });
  });

  describe("dot notation path references", () => {
    it("relative .a-->.c resolves to local paths", () => {
      const model = parse("a() c()\nb{a c .a-->.c}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("b{}.a()");
      expect(rels[0].target).toBe("b{}.c()");
      expect(model.elements["b{}"].childIds).toContain("a()");
      expect(model.elements["b{}"].childIds).toContain("c()");
    });

    it("relative source with global target: .a-->c", () => {
      const model = parse("a() c()\nd{a .a-->c}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("d{}.a()");
      expect(rels[0].target).toBe("c()");
    });

    it("global source with relative target: a-->.c", () => {
      const model = parse("a() c()\ne{c a-->.c}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("a()");
      expect(rels[0].target).toBe("e{}.c()");
    });

    it("absolute path alt.a-->alt.c", () => {
      const model = parse("alt{a c}\nf{alt.a-->alt.c}");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("alt{}.a{}");
      expect(rels[0].target).toBe("alt{}.c{}");
      expect(model.elements["f{}"].childIds).toHaveLength(0);
    });

    it("skips relationship and emits validation error when .a not in container", () => {
      const model = parse("a() c()\ng{.a-->c}");
      expect(Object.values(model.relationships)).toHaveLength(0);
      expect(model.validationErrors?.length).toBeGreaterThan(0);
    });
  });

  describe("function container with pre-existing shared elements — c(a b)", () => {
    it("adds pre-existing root elements as children of the function container", () => {
      const model = parse("a b c(a b)");
      expect(model.elements["c()"].childIds).toContain("a{}");
      expect(model.elements["c()"].childIds).toContain("b{}");
      expect(model.root.childIds).toContain("a{}");
      expect(model.root.childIds).toContain("b{}");
      expect(model.root.childIds).toContain("c()");
    });

    it("element used as chain target after being declared in function container is added to root", () => {
      const model = parse("c(a)\ngen(x) ..> a() ..> b()");
      expect(model.root.childIds).toContain("a()");
      expect(model.elements["c()"].childIds).toContain("a()");
    });

    it("path token c.a as rel target chains to b: c.a→b relationship is created", () => {
      const model = parse("a() c(a)\ngen(x) ..> c.a ..> b()");
      const rels = Object.values(model.relationships);
      const ca_b = rels.find((r) => r.source === "c().a()" && r.target === "b()");
      expect(ca_b).toBeDefined();
    });

    it("absolute path c.a-->c.b from root scope produces a valid relationship", () => {
      const model = parse("a b c(a b)\nc.a --> c.b");
      const rels = Object.values(model.relationships);
      expect(rels).toHaveLength(1);
      expect(rels[0].source).toBe("c().a{}");
      expect(rels[0].target).toBe("c().b{}");
      expect(model.validationErrors).toBeUndefined();
    });

    it("absolute path c.a-->c.b is removed when c has no children", () => {
      const model = parse("a b c()\nc.a --> c.b");
      expect(Object.values(model.relationships)).toHaveLength(0);
      expect(model.validationErrors?.length).toBeGreaterThan(0);
    });
  });
});
