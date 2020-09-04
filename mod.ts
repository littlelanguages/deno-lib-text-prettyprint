/**
 * The abstract class of documents.  This class is specialised into specific concrete classes to capture document composition.
 */
export abstract class Doc {
  /**
   * Equalivalent to `hcat([this, d])`.
   */
  p(d: Doc): Doc {
    return new PlusDoc(this, d);
  }

  /**
   * Equalivalent to `hsep([this, d], sep)` with `sep` defaulting to a space (" ").
   */
  pp(d: Doc, sep: Doc = space): Doc {
    return new PlusPlusDoc(this, sep, d);
  }
}

class EmptyDoc extends Doc {}

class VerticalDoc extends Doc {
  docs: Array<Doc>;

  constructor(docs: Array<Doc>) {
    super();
    this.docs = docs;
  }
}

class TextDoc extends Doc {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }
}

class PlusDoc extends Doc {
  l: Doc;
  r: Doc;

  constructor(l: Doc, r: Doc) {
    super();
    this.l = l;
    this.r = r;
  }
}

class PlusPlusDoc extends Doc {
  l: Doc;
  sep: Doc;
  r: Doc;

  constructor(l: Doc, sep: Doc, r: Doc) {
    super();
    this.l = l;
    this.sep = sep;
    this.r = r;
  }
}

class NestDoc extends Doc {
  offset: number;
  doc: Doc;

  constructor(offset: number, doc: Doc) {
    super();
    this.offset = offset;
    this.doc = doc;
  }
}

/**
 * An empty document.  
 */
export const empty: Doc = new EmptyDoc();

/**
 * A document composed of "".
 */
export const blank: Doc = text("");

/**
 * A document composed of ",".
 */
export const comma: Doc = text(",");

/**
 * A document composed of " ".
 */
export const space: Doc = text(" ");

/**
 * A document composed of the literal string `t`.
 */
export function text(t: string): Doc {
  return new TextDoc(t);
}

/**
 * A document composed of the literal number `n`.
 */
export function number(n: number): Doc {
  return new TextDoc("" + n);
}

export function vcat(docs: Array<Doc>): Doc {
  return new VerticalDoc(docs);
}

export function hsep(docs: Array<Doc>, sep: Doc = space): Doc {
  if (docs.length == 0) {
    return empty;
  } else if (docs.length == 1) {
    return docs[0];
  } else {
    return docs.slice(1).reduce((a, b) => a.pp(b, sep), docs[0]);
  }
}

export function hcat(docs: Array<Doc>): Doc {
  if (docs.length == 0) {
    return empty;
  } else if (docs.length == 1) {
    return docs[0];
  } else {
    return docs.slice(1).reduce((a, b) => a.p(b), docs[0]);
  }
}

export function nest(offset: number, doc: Doc): Doc {
  return new NestDoc(offset, doc);
}

export function punctuate(separator: Doc, docs: Array<Doc>): Array<Doc> {
  const last = docs.length;
  if (last == 0 || last == 1) {
    return docs;
  } else {
    const result = [];

    for (let lp = 0; lp < last - 1; lp += 1) {
      result.push(docs[lp].p(separator));
    }
    result.push(docs[last - 1]);

    return result;
  }
}

export function render(
  doc: Doc,
  writer: Deno.Writer,
): Promise<void> {
  const encoder = new TextEncoder();

  function renderp(
    d: Doc,
    leftMargin: number,
    offset: number,
    writer: Deno.Writer,
  ): Promise<number> {
    if (d instanceof EmptyDoc) {
      return Promise.resolve(offset);
    } else if (d instanceof TextDoc) {
      return writer.write(encoder.encode(d.text)).then((_) =>
        offset + d.text.length
      );
    } else if (d instanceof VerticalDoc) {
      if (d.docs.length == 0) {
        return Promise.resolve(offset);
      } else {
        const lm = Math.max(leftMargin, offset);

        let off = Promise.resolve(offset);
        d.docs.filter((line) => !(line instanceof EmptyDoc)).forEach(
          (line, idx) => {
            off = off.then((o) => {
              const spaces = (o < lm) ? " ".repeat(lm - o) : "";
              return writer.write(encoder.encode(spaces)).then((_) =>
                renderp(line, lm, o, writer)
              );
            }).then((o) => {
              if (idx != d.docs.length - 1) {
                return writer.write(encoder.encode("\n")).then((_) => 0);
              } else {
                return o;
              }
            });
          },
        );

        return off;
      }
    } else if (d instanceof PlusDoc) {
      return renderp(d.l, leftMargin, offset, writer).then((off) =>
        renderp(d.r, leftMargin, off, writer)
      );
    } else if (d instanceof PlusPlusDoc) {
      if (d.l == empty && d.r == empty) {
        return Promise.resolve(offset);
      } else if (d.l == empty) {
        return renderp(d.r, leftMargin, offset, writer);
      } else if (d.r == empty) {
        return renderp(d.l, leftMargin, offset, writer);
      } else {
        return renderp(d.l, leftMargin, offset, writer).then((off) =>
          renderp(d.sep, leftMargin, off, writer)
        ).then((off) => renderp(d.r, leftMargin, off, writer));
      }
    } else if (d instanceof NestDoc) {
      const newLeftMargin = leftMargin + d.offset;
      const spaces = (offset < newLeftMargin)
        ? " ".repeat(newLeftMargin - offset)
        : "";
      return writer.write(encoder.encode(spaces)).then((_) =>
        renderp(d.doc, newLeftMargin, Math.max(offset, newLeftMargin), writer)
      );
    } else {
      throw d;
    }
  }

  return renderp(doc, 0, 0, writer).then((_) =>
    writer.write(encoder.encode("\n"))
  ).then((_) => {});
}
