/**
 * The abstract class of documents.  This class is specialised into specific concrete classes to capture document composition.
 */
export abstract class Doc {
  /**
   * Equalivalent to `hcat([this, d])`.
   */
  p(d: Doc | string): Doc {
    return new PlusDoc(this, toDoc(d));
  }

  /**
   * Equalivalent to `hsep([this, d], sep)` with `sep` defaulting to a space (" ").
   */
  pp(d: Doc | string, sep: Doc | string = space): Doc {
    return new PlusPlusDoc(this, toDoc(sep), toDoc(d));
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

class IndentDoc extends Doc {
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

function toDoc(doc: Doc | string): Doc {
  return (doc instanceof Doc) ? doc : text(doc);
}

/**
 * Arranges `docs` to be rendered vertically with a newline at the end of each of its elements.  The left margin is respected.
 */
export function vcat(docs: Array<Doc | string>): Doc {
  return new VerticalDoc(docs.map(toDoc));
}

/**
 * Arranges `docs` to be rendered vertically with a newline at the end of each of its elements.  The left margin is set to the offset of the current line which is applied to all elements in `docs`.
 */
export function indent(docs: Array<Doc | string>): Doc {
  return new IndentDoc(docs.map(toDoc));
}

export function hsep(
  docs: Array<Doc | string>,
  sep: Doc | string = space,
): Doc {
  if (docs.length == 0) {
    return empty;
  } else {
    const docDocs = docs.map(toDoc);

    if (docDocs.length == 1) {
      return docDocs[0];
    } else {
      return docDocs.slice(1).reduce((a, b) => a.pp(b, sep), docDocs[0]);
    }
  }
}

export function hcat(docs: Array<Doc | string>): Doc {
  if (docs.length == 0) {
    return empty;
  } else {
    const docDocs = docs.map(toDoc);

    if (docDocs.length == 1) {
      return docDocs[0];
    } else {
      return docDocs.slice(1).reduce((a, b) => a.p(b), docDocs[0]);
    }
  }
}

/**
 *  Nests from the left margin by `offset` spaces.
 */
export function nest(offset: number, doc: Doc | string): Doc {
  return new NestDoc(offset, toDoc(doc));
}

export function punctuate(
  separator: Doc | string,
  docs: Array<Doc | string>,
): Array<Doc> {
  const last = docs.length;
  const docDocs = docs.map(toDoc);

  if (last == 0 || last == 1) {
    return docDocs;
  } else {
    const result = [];

    const docSeparator = toDoc(separator);
    for (let lp = 0; lp < last - 1; lp += 1) {
      result.push(docDocs[lp].p(docSeparator));
    }
    result.push(docDocs[last - 1]);

    return result;
  }
}

export function render(
  doc: Doc,
  writer: Deno.Writer,
): Promise<void> {
  const encoder = new TextEncoder();

  function renderVertically(
    docs: Array<Doc>,
    leftMargin: number,
    offset: number,
  ): Promise<number> {
    let off = Promise.resolve(offset);
    docs.filter((line) => !(line instanceof EmptyDoc)).forEach(
      (line, idx) => {
        off = off.then((o) => {
          const spaces = (o < leftMargin) ? " ".repeat(leftMargin - o) : "";
          return writer.write(encoder.encode(spaces)).then((_) =>
            renderp(line, leftMargin, o, writer)
          );
        }).then((o) => {
          if (idx != docs.length - 1) {
            return writer.write(encoder.encode("\n")).then((_) => 0);
          } else {
            return o;
          }
        });
      },
    );

    return off;
  }

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
      return renderVertically(d.docs, leftMargin, offset);
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
        renderp(d.doc, newLeftMargin, newLeftMargin, writer)
      );
    } else if (d instanceof IndentDoc) {
      return renderVertically(d.docs, offset, offset);
    } else {
      throw d;
    }
  }

  return renderp(doc, 0, 0, writer).then((_) =>
    writer.write(encoder.encode("\n"))
  ).then((_) => {});
}
