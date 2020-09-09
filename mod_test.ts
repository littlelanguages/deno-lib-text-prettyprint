import * as Assert from "https://deno.land/std@0.63.0/testing/asserts.ts";
import * as PP from "./mod.ts";

Deno.test("render blank", () => {
  assertRenderEquals(
    PP.blank,
    "\n",
  );
});

Deno.test("render space", () => {
  assertRenderEquals(
    PP.space,
    " \n",
  );
});

Deno.test("render comma", () => {
  assertRenderEquals(
    PP.comma,
    ",\n",
  );
});

Deno.test("render number", () => {
  assertRenderEquals(
    PP.number(123),
    "123\n",
  );
});

Deno.test("render vcat", () => {
  assertRenderEquals(PP.vcat([]), "\n");
  assertRenderEquals(PP.vcat([PP.text("Hello")]), "Hello\n");
  assertRenderEquals(
    PP.vcat([PP.text("Hello"), PP.text("World")]),
    "Hello\nWorld\n",
  );
  assertRenderEquals(PP.vcat([PP.blank, PP.text("World")]), "\nWorld\n");

  assertRenderEquals(
    PP.vcat(
      [
        PP.text("Hello"),
        PP.text("World"),
        PP.text("Bye"),
        PP.text("Bye"),
        PP.text("Love"),
      ],
    ),
    "Hello\nWorld\nBye\nBye\nLove\n",
  );

  assertRenderEquals(PP.vcat(["Hello"]), "Hello\n");
  assertRenderEquals(
    PP.vcat(["Hello", "World"]),
    "Hello\nWorld\n",
  );
  assertRenderEquals(PP.vcat([PP.blank, "World"]), "\nWorld\n");

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
    "Hello\nWorld\nBye\nBye\nLove\n",
  );
});

Deno.test("render hcat", () => {
  assertRenderEquals(PP.hcat([]), "\n");
  assertRenderEquals(PP.hcat([PP.text("hello")]), "hello\n");
  assertRenderEquals(
    PP.hcat([PP.text("hello"), PP.text("world")]),
    "helloworld\n",
  );

  assertRenderEquals(PP.hcat(["hello"]), "hello\n");
  assertRenderEquals(
    PP.hcat(["hello", "world"]),
    "helloworld\n",
  );
});

Deno.test("render hsep", () => {
  assertRenderEquals(PP.hsep([]), "\n");
  assertRenderEquals(PP.hsep([PP.text("hello")]), "hello\n");
  assertRenderEquals(
    PP.hsep([PP.text("hello"), PP.text("world")]),
    "hello world\n",
  );

  assertRenderEquals(PP.hsep([], PP.text("---")), "\n");
  assertRenderEquals(PP.hsep([PP.text("hello")], PP.text("---")), "hello\n");
  assertRenderEquals(
    PP.hsep([PP.text("hello"), PP.text("world")], PP.text("---")),
    "hello---world\n",
  );

  assertRenderEquals(PP.hsep(["hello"]), "hello\n");
  assertRenderEquals(
    PP.hsep(["hello", "world"]),
    "hello world\n",
  );

  assertRenderEquals(PP.hsep([], "---"), "\n");
  assertRenderEquals(PP.hsep(["hello"], "---"), "hello\n");
  assertRenderEquals(
    PP.hsep([PP.text("hello"), "world"], "---"),
    "hello---world\n",
  );
});

Deno.test("render nest", () => {
  const content = PP.vcat(["hello", "to", "the", PP.text("world")]);

  assertRenderEquals(PP.nest(0, content), "hello\nto\nthe\nworld\n");
  assertRenderEquals(PP.nest(2, content), "  hello\n  to\n  the\n  world\n");

  assertRenderEquals(
    PP.text("a").p(PP.nest(2, content)),
    "a hello\n  to\n  the\n  world\n",
  );
  assertRenderEquals(
    PP.text("ab").p(PP.nest(2, content)),
    "abhello\n  to\n  the\n  world\n",
  );
  assertRenderEquals(
    PP.text("abc").p(PP.nest(2, content)),
    "abchello\n  to\n  the\n  world\n",
  );
});

Deno.test("render indent", () => {
  const content = ["hello", "to", "the", PP.text("world")];

  assertRenderEquals(PP.indent(content), "hello\nto\nthe\nworld\n");
  assertRenderEquals(PP.hcat(["abc", PP.indent(content), "xyz"]), "abchello\n   to\n   the\n   worldxyz\n");
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
