import * as Assert from "https://deno.land/std@0.68.0/testing/asserts.ts";
import * as PP from "./mod.ts";

Deno.test("render blank", () => {
  assertRenderEquals(
    PP.blank,
    "",
  );
});

Deno.test("render space", () => {
  assertRenderEquals(
    PP.space,
    " ",
  );
});

Deno.test("render comma", () => {
  assertRenderEquals(
    PP.comma,
    ",",
  );
});

Deno.test("render number", () => {
  assertRenderEquals(
    PP.number(123),
    "123",
  );
});

Deno.test("render vcat", () => {
  assertRenderEquals(PP.vcat([]), "");
  assertRenderEquals(PP.vcat([PP.text("Hello")]), "Hello");
  assertRenderEquals(
    PP.vcat([PP.text("Hello"), PP.text("World")]),
    "Hello\nWorld",
  );
  assertRenderEquals(PP.vcat([PP.blank, PP.text("World")]), "\nWorld");

  assertRenderEquals(
    PP.vcat(
      [
        PP.text("Hello"),
        PP.text("World"),
        PP.empty,
        PP.text("Bye"),
        PP.text("Bye"),
        PP.text("Love"),
      ],
    ),
    "Hello\nWorld\nBye\nBye\nLove",
  );

  assertRenderEquals(PP.vcat(["Hello"]), "Hello");
  assertRenderEquals(
    PP.vcat(["Hello", "World"]),
    "Hello\nWorld",
  );
  assertRenderEquals(PP.vcat([PP.blank, "World"]), "\nWorld");

  assertRenderEquals(
    PP.vcat(
      [
        "Hello",
        PP.text("World"),
        "Bye",
        PP.text("Bye"),
        "Love",
      ],
    ),
    "Hello\nWorld\nBye\nBye\nLove",
  );
});

Deno.test("render hcat", () => {
  assertRenderEquals(PP.hcat([]), "");
  assertRenderEquals(PP.hcat([PP.text("hello")]), "hello");
  assertRenderEquals(
    PP.hcat([PP.text("hello"), PP.text("world")]),
    "helloworld",
  );

  assertRenderEquals(PP.hcat(["hello"]), "hello");
  assertRenderEquals(
    PP.hcat(["hello", "world"]),
    "helloworld",
  );
});

Deno.test("render hsep", () => {
  assertRenderEquals(PP.hsep([]), "");
  assertRenderEquals(PP.hsep([PP.text("hello")]), "hello");
  assertRenderEquals(
    PP.hsep([PP.text("hello"), PP.text("world")]),
    "hello world",
  );

  assertRenderEquals(PP.hsep([], PP.text("---")), "");
  assertRenderEquals(PP.hsep([PP.text("hello")], PP.text("---")), "hello");
  assertRenderEquals(
    PP.hsep([PP.text("hello"), PP.text("world")], PP.text("---")),
    "hello---world",
  );

  assertRenderEquals(PP.hsep(["hello"]), "hello");
  assertRenderEquals(
    PP.hsep(["hello", "world"]),
    "hello world",
  );

  assertRenderEquals(PP.hsep([], "---"), "");
  assertRenderEquals(PP.hsep(["hello"], "---"), "hello");
  assertRenderEquals(
    PP.hsep([PP.text("hello"), "world"], "---"),
    "hello---world",
  );
});

Deno.test("render nest", () => {
  const content = PP.vcat(["hello", "to", "the", PP.text("world")]);

  assertRenderEquals(PP.nest(0, content), "hello\nto\nthe\nworld");
  assertRenderEquals(PP.nest(2, content), "  hello\n  to\n  the\n  world");

  assertRenderEquals(
    PP.text("a").p(PP.nest(2, content)),
    "a hello\n  to\n  the\n  world",
  );
  assertRenderEquals(
    PP.text("ab").p(PP.nest(2, content)),
    "abhello\n  to\n  the\n  world",
  );
  assertRenderEquals(
    PP.text("abc").p(PP.nest(2, content)),
    "abchello\n  to\n  the\n  world",
  );

  assertRenderEquals(
    PP.text("abc").p(PP.nest(10, "xyz")),
    "abc       xyz",
  );

  const cmds = [
    { name: "deno", help: "deno help" },
    { name: "viz", help: "viz help" },
    { name: "help", help: "help help" },
  ];
  const doc = PP.nest(
    4,
    PP.vcat(
      cmds.flatMap((cmd) => PP.text(cmd.name).p(PP.nest(20, cmd.help))),
    ),
  );

  assertRenderEquals(
    doc,
    "    deno                deno help\n" +
      "    viz                 viz help\n" +
      "    help                help help",
  );
});

Deno.test("render join", () => {
  assertRenderEquals(PP.join([]), "");
  assertRenderEquals(PP.join(["a"]), "a");
  assertRenderEquals(PP.join(["a", "b"]), "a b");
  assertRenderEquals(PP.join(["a", "b", "c"]), "a b c");

  assertRenderEquals(PP.join([], ", "), "");
  assertRenderEquals(PP.join(["a"], ", "), "a");
  assertRenderEquals(PP.join(["a", "b"], ", "), "a, b");
  assertRenderEquals(PP.join(["a", "b", "c"], ", "), "a, b, c");

  assertRenderEquals(PP.join([], ", ", " or "), "");
  assertRenderEquals(PP.join(["a"], ", ", " or "), "a");
  assertRenderEquals(PP.join(["a", "b"], ", ", " or "), "a or b");
  assertRenderEquals(PP.join(["a", "b", "c"], ", ", " or "), "a, b or c");
});

Deno.test("render indent", () => {
  const content = ["hello", "to", "the", PP.text("world")];

  assertRenderEquals(PP.indent(content), "hello\nto\nthe\nworld");
  assertRenderEquals(
    PP.hcat(["abc", PP.indent(content), "xyz"]),
    "abchello\n   to\n   the\n   worldxyz",
  );
});

async function assertRenderEquals(doc: PP.Doc, text: string) {
  const sw = new StringWriter();

  await PP.render(doc, sw);

  Assert.assertEquals(sw.str, text);
}

class StringWriter implements Deno.Writer {
  decoder = new TextDecoder();
  str = "";

  write(p: Uint8Array): Promise<number> {
    this.str = this.str + this.decoder.decode(p);
    return Promise.resolve(p.length);
  }
}
