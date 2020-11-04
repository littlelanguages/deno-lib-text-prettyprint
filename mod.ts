/**
 * The structure used to represent a document
 */
export type Doc =
  | EmptyDoc
  | VerticalDoc
  | IndentDoc
  | TextDoc
  | PlusDoc
  | PlusPlusDoc
  | NestDoc;

type EmptyDoc = {
  tag: "EmptyDoc";
};

type VerticalDoc = {
  tag: "VerticalDoc";
  docs: Array<Doc>;
};

type IndentDoc = {
  tag: "IndentDoc";
  docs: Array<Doc>;
};

type TextDoc = {
  tag: "TextDoc";
  text: string;
};

type PlusDoc = {
  tag: "PlusDoc";
  l: Doc;
  r: Doc;
};

type PlusPlusDoc = {
  tag: "PlusPlusDoc";
  l: Doc;
  sep: Doc;
  r: Doc;
};

type NestDoc = {
  tag: "NestDoc";
  offset: number;
  doc: Doc;
};

/**
 * A document composed of the literal string `t`.
 */
export const text = (t: string): Doc => ({
  tag: "TextDoc",
  text: t,
});

/**
 * An empty document.  
 */
export const empty: Doc = { tag: "EmptyDoc" };

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
 * A document composed of the literal number `n`.
 */
export const number = (n: number): Doc => text("" + n);

const toDoc = (doc: Doc | string): Doc =>
  (doc instanceof Object) ? doc : text(doc);

/**
 * Arranges `docs` to be rendered vertically with a newline at the end of each of its elements.  The left margin is respected.
 */
export const vcat = (docs: Array<Doc | string>): Doc => ({
  tag: "VerticalDoc",
  docs: (docs.map(toDoc)),
});

/**
 * Arranges `docs` to be rendered vertically with a newline at the end of each of its elements.  The left margin is set to the offset of the current line which is applied to all elements in `docs`.
 */
export const indent = (docs: Array<Doc | string>): Doc => ({
  tag: "IndentDoc",
  docs: (docs.map(toDoc)),
});

/**
 * Combines `l` and `r` horizontally without a separator between them.
 */
export const p = (l: Doc, r: Doc): Doc =>
  l.tag == "EmptyDoc" ? r : ({ tag: "PlusDoc", l, r });

/**
 * Combines `l` and `r` horizontally with `sep` as the separator between them.
 */
export const pp = (l: Doc, r: Doc, sep: Doc | string = space): Doc =>
  sep === ""
    ? pp(l, r, blank)
    : sep instanceof Object
    ? (sep.tag === "EmptyDoc"
      ? p(l, r)
      : sep.tag === "TextDoc" && sep.text === ""
      ? p(l, r)
      : {
        tag: "PlusPlusDoc",
        l,
        sep,
        r,
      })
    : pp(l, r, toDoc(sep));

export const hsep = (
  docs: Array<Doc | string>,
  sep: Doc | string = space,
): Doc => {
  if (docs.length === 0) {
    return empty;
  } else {
    const docDocs = docs.map(toDoc);

    if (docDocs.length === 1) {
      return docDocs[0];
    }

    // oh the ES6 gorgeousness! https://stackoverflow.com/a/59411548/761388
    const [theFirst, ...allButTheFirst] = docDocs;
    return allButTheFirst.reduce((a, b) => pp(a, b, sep), theFirst);
  }
};

export const hcat = (docs: Array<Doc | string>): Doc => {
  if (docs.length === 0) {
    return empty;
  } else {
    const docDocs = docs.map(toDoc);

    if (docDocs.length === 1) {
      return docDocs[0];
    } else {
      return docDocs.slice(1).reduce((a, b) => p(a, b), docDocs[0]);
    }
  }
};

/**
 *  Nests from the left margin by `offset` spaces.
 */
export const nest = (offset: number, doc: Doc | string): Doc => ({
  tag: "NestDoc",
  offset,
  doc: toDoc(doc),
});

export const punctuate = (
  separator: Doc | string,
  docs: Array<Doc | string>,
): Array<Doc> => {
  const last = docs.length;
  const docDocs = docs.map(toDoc);

  if (last === 0 || last === 1) {
    return docDocs;
  } else {
    const result = [];

    const docSeparator = toDoc(separator);
    for (let lp = 0; lp < last - 1; lp += 1) {
      result.push(p(docDocs[lp], docSeparator));
    }
    result.push(docDocs[last - 1]);

    return result;
  }
};

/**
 * Joins `docs` together placing `separator` between each.  If `lastSeparator` is not undefined then `lastSeparator` is used instead of 
 * `separator` in separating the final two elements of `docs`.
 * 
 * `lastSeparator` is useful when wanting to make elements readable.
 * 
 * ```ts
 * join(['a', 'b', 'c'], ', ', ' and ') === 'a, b and c'
 * ```
 */
export const join = (
  docs: Array<Doc | string>,
  separator: Doc | string = space,
  lastSeparator: Doc | string | undefined = undefined,
): Doc => {
  if (docs.length === 0) {
    return blank;
  } else {
    const result = [];
    let index = 0;
    const docSeparator = toDoc(separator);

    while (true) {
      if (index === docs.length - 1) {
        if (index > 0) {
          result.push(
            lastSeparator == undefined ? docSeparator : lastSeparator,
          );
        }
        result.push(docs[index]);
        break;
      } else if (index > 0) {
        result.push(docSeparator);
      }
      result.push(docs[index]);
      index += 1;
    }

    return hcat(result);
  }
};

export const render = (
  doc: Doc,
  writer: Deno.Writer,
): Promise<void> => {
  const encoder = new TextEncoder();

  function renderVertically(
    docs: Array<Doc>,
    leftMargin: number,
    offset: number,
  ): Promise<number> {
    let off = Promise.resolve(offset);
    const newDocs = docs.filter((line) => line.tag !== "EmptyDoc");

    newDocs.forEach(
      (line, idx) => {
        off = off.then((o) => {
          const spaces = (o < leftMargin) ? " ".repeat(leftMargin - o) : "";
          return writer.write(encoder.encode(spaces)).then((_) =>
            renderp(line, leftMargin, o + spaces.length, writer)
          );
        }).then((o) => {
          if (idx != newDocs.length - 1) {
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
    if (d.tag === "EmptyDoc") {
      return Promise.resolve(offset);
    } else if (d.tag === "TextDoc") {
      return writer.write(encoder.encode(d.text)).then((_) =>
        offset + d.text.length
      );
    } else if (d.tag === "VerticalDoc") {
      return renderVertically(d.docs, leftMargin, offset);
    } else if (d.tag === "PlusDoc") {
      return renderp(d.l, leftMargin, offset, writer).then((off) =>
        renderp(d.r, leftMargin, off, writer)
      );
    } else if (d.tag === "PlusPlusDoc") {
      if (d.l.tag === "EmptyDoc" && d.r.tag === "EmptyDoc") {
        return Promise.resolve(offset);
      } else if (d.l.tag === "EmptyDoc") {
        return renderp(d.r, leftMargin, offset, writer);
      } else if (d.r.tag === "EmptyDoc") {
        return renderp(d.l, leftMargin, offset, writer);
      } else {
        return renderp(d.l, leftMargin, offset, writer).then((off) =>
          renderp(d.sep, leftMargin, off, writer)
        ).then((off) => renderp(d.r, leftMargin, off, writer));
      }
    } else if (d.tag === "NestDoc") {
      const newLeftMargin = leftMargin + d.offset;

      const spaces = (offset < newLeftMargin)
        ? " ".repeat(newLeftMargin - offset)
        : "";
      return writer.write(encoder.encode(spaces)).then((_) =>
        renderp(d.doc, newLeftMargin, newLeftMargin, writer)
      );
    } else if (d.tag === "IndentDoc") {
      return renderVertically(d.docs, offset, offset);
    } else {
      throw d;
    }
  }

  return renderp(doc, 0, 0, writer).then((_) => {});
};
