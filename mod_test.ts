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
});

Deno.test("render hcat", () => {
  assertRenderEquals(PP.hcat([]), "\n");
  assertRenderEquals(PP.hcat([PP.text("hello")]), "hello\n");
  assertRenderEquals(
    PP.hcat([PP.text("hello"), PP.text("world")]),
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
});

Deno.test("render nest", () => {
  const content = PP.vcat([PP.text("hello"), PP.text("world")]);

  assertRenderEquals(PP.nest(0, content), "hello\nworld\n");
  assertRenderEquals(PP.nest(2, content), "  hello\n  world\n");

  assertRenderEquals(
    PP.text("bye").p(PP.nest(2, content)),
    "byehello\n   world\n",
  );
});

async function assertRenderEquals(doc: PP.Doc, text: string) {
  const sw = new StringWriter();

  await PP.render(doc, sw);

  Assert.assertEquals(sw.str, text);
}

class StringWriter implements Deno.Writer {
  str = "";

  write(p: Uint8Array): Promise<number> {
    const decoder = new TextDecoder();

    this.str = this.str + decoder.decode(p);
    return Promise.resolve(p.length);
  }
}
