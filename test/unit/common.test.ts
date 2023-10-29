import { Node } from "../../src/parser.js";
import { lex, getScanner, Scanner } from "../../src/lexer.js";

import test from "node:test";
import assert from "node:assert";

export function matchNode(actual: Node, expected: Node): void {
    assert.deepStrictEqual(
        actual,
        expected,
        `${actual.kind} is not ${expected.kind}`
    );
}

export function parserTest(
    desc: string,
    code: string,
    f: (scanner: Scanner) => void
) {
    test(`${desc}: '${code}'`, () => {
        const scanner = getScanner(lex(code));
        f(scanner);
    });
}
