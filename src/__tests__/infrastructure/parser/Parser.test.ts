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
    expect(player.childIds.size).toBe(0);
    expect(username.childIds.size).toBe(0);
    expect(password.childIds.size).toBe(0);
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

  it("shuold parse decision tree", () => {
    const model = parse(
      "<start<if1 if2 else1> op1 op2 op3<if3 if4 if5> op4 op5 op6>",
    );
    expect(Object.values(model.elements).length).toBe(13);
    const [start, if1, if2, else1, , , op3, if3, if4, if5] = Array.from(
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
    // todo
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
    expect(Object.values(model.elements).length).toBe(2);
    const [root, world] = Array.from(Object.values(model.elements));
    const rel = Array.from(Object.values(model.relationships))[0];
    expect(rel.source).toBe(root.id);
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
});
