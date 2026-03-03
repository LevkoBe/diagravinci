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
    expect(elem.id).toBe("player");
    expect(elem.type).toBe("object");
  });

  it("should parse element with wrapper", () => {
    const model = parse("player{}");
    expect(Object.values(model.elements).length).toBe(1);
    const elem = Array.from(Object.values(model.elements))[0];
    expect(elem.id).toBe("player");
    expect(elem.type).toBe("object");
  });

  it("should parse a collection", () => {
    const model = parse("players[]");
    expect(Object.values(model.elements).length).toBe(1);
    const elem = Array.from(Object.values(model.elements))[0];
    expect(elem.id).toBe("players");
    expect(elem.type).toBe("state");
  });

  it("should parse element with properties", () => {
    const model = parse("player{username password}");
    expect(Object.values(model.elements).length).toBe(3);

    const [player, username, password] = Array.from(
      Object.values(model.elements),
    );
    expect(player.id).toBe("player");
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
    expect(items.type).toBe("state");
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
    expect(player.id).toBe("players");
    expect(player.type).toBe("state");
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
    expect(play.type).toBe("state");
    expect(walk.type).toBe("state");
    expect(fight.type).toBe("state");
    expect(start.type).toBe("function");
    expect(step1.type).toBe("function");
    expect(step2.type).toBe("function");
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
    Array.from(Object.values(model.elements)).forEach((e) =>
      expect(e.type).toBe("choice"),
    );
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
    expect(rel.source).toBe(player.id);
    expect(rel.target).toBe(tool.id);
  });

  it("should parse composition relationship", () => {
    const model = parse("whole *-- part");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.type).toBe("*--");
  });

  it("should parse aggregation relationship", () => {
    const model = parse("container o-- item");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.type).toBe("o--");
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
    expect(rel.source).toBe(player.id);
    expect(rel.target).toBe(world.id);
  });

  it("should preserve element order", () => {
    const model = parse("first second third");
    expect(Object.values(model.elements).length).toBe(3);
    const [first, second, third] = Array.from(Object.values(model.elements));
    expect(first.id).toBe("first");
    expect(second.id).toBe("second");
    expect(third.id).toBe("third");
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
    expect(rel1.source).toBe(match.id);
    expect(rel1.target).toBe(player.id);
    expect(rel1.type).toBe("o--");
    expect(rel2.source).toBe(match.id);
    expect(rel2.target).toBe(gameSession.id);
    expect(rel2.type).toBe("*--");
    expect(rel3.source).toBe(player.id);
    expect(rel3.target).toBe(inventory.id);
    expect(rel3.type).toBe("o--");
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
    expect(Object.values(model.elements).length).toBe(4);
    expect(model.root.childIds.length).toBe(3);
    const [player, flow, emeralds, shop] = Array.from(
      Object.values(model.elements),
    );
    expect(player.type).toBe("object");
    expect(flow.type).toBe("flow");
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
    expect(anon1.type).toBe("state");
    expect(a1.type).toBe("state");
    expect(b.type).toBe("object");
    expect(anon2.type).toBe("object");
    expect(b1.type).toBe("object");
    expect(c.type).toBe("object");
    expect(anon3.type).toBe("function");
    expect(c1.type).toBe("function");
    expect(d.type).toBe("object");
    expect(anon4.type).toBe("choice");
    expect(d1.type).toBe("choice");
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
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
    const [rel1, rel2, rel3] = Array.from(Object.values(model.relationships));
    expect(rel1.source).toBe(a.id);
    expect(rel1.target).toBe(b.id);
    expect(rel1.type).toBe("-->");
    expect(rel2.source).toBe(b.id);
    expect(rel2.target).toBe(a.id);
    expect(rel2.type).toBe("-->");
    expect(rel3.source).toBe(b.id);
    expect(rel3.target).toBe(a.id);
    expect(rel3.type).toBe("*--");
  });

  it("should parse relationship of arbitrary length", () => {
    const model = parse(
      "a -- b a --- b a ----------------------- b a ------------------------ b",
    );
    expect(Object.values(model.elements).length).toBe(2);
    expect(Object.values(model.relationships).length).toBe(1);
    const [a, b] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.source).toBe(a.id);
  });

  it("should handle multilayer nesting properly", () => {
    const model = parse("a{{}}");
    expect(Object.values(model.elements).length).toBe(2);
    const [a, anon] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a");
    expect(a.childIds).toContain(anon.id);
    expect(a.childIds.length).toBe(1);
  });

  it("should parse curried function (QUESTIONABLE)", () => {
    const model = parse("f(x)(y)(z)");
    expect(Object.values(model.elements).length).toBe(4);
    const [f, x, y, z] = Array.from(Object.values(model.elements));
    expect(f.id).toBe("f");
    expect(f.type).toBe("function");
    expect(f.childIds).toContain(x.id);
    expect(f.childIds).toContain(y.id);
    expect(f.childIds).toContain(z.id);
    expect(x.type).toBe("function");
    expect(y.type).toBe("function");
    expect(z.type).toBe("function");
  });

  it("should parse other chainings", () => {
    const model = parse("f(a){b}[c]<d>");
    expect(Object.values(model.elements).length).toBe(5);
    const [f, a, b, c, d] = Array.from(Object.values(model.elements));
    expect(f.id).toBe("f");
    expect(f.type).toBe("choice");
    expect(f.childIds).toContain(a.id);
    expect(f.childIds).toContain(b.id);
    expect(f.childIds).toContain(c.id);
    expect(f.childIds).toContain(d.id);
    expect(a.type).toBe("function");
    expect(b.type).toBe("object");
    expect(c.type).toBe("state");
    expect(d.type).toBe("choice");
  });

  it("should handle relationships inside and outside of scope", () => {
    const model = parse("a{-->b-->}");
    expect(Object.values(model.elements).length).toBe(2);
    expect(Object.values(model.relationships).length).toBe(2);
    const [a, b] = Array.from(Object.values(model.elements));
    const [rel1, rel2] = Object.values(model.relationships);
    expect(rel1.source).toBe(a.id);
    expect(rel1.target).toBe(b.id);
    expect(rel2.source).toBe(b.id);
    expect(rel2.target).toBe(a.id);
  });

  it("should handle deep nesting duplicates", () => {
    const model = parse("a{a{a{a{a}}}}");
    expect(Object.values(model.elements).length).toBe(1);
    const a = Array.from(Object.values(model.elements))[0];
    expect(a.id).toBe("a");
    expect(a.childIds).toContain(a.id);
  });

  it("should parse correctly complex nesting duplicates", () => {
    const model = parse("a{a b{a{a b c} b}} c{a{b}}");
    expect(Object.values(model.elements).length).toBe(3);
    const [a, b, c] = Array.from(Object.values(model.elements));
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
    expect(c.id).toBe("c");
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
