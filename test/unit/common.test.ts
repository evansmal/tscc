import { Node, Program, parse } from "../../src/parser.js";
import { lex, getScanner, Scanner } from "../../src/lexer.js";
import { SymbolAnalysisResult, analyzeProgram } from "../../src/semantics.js";

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

export function semanticTest(
    desc: string,
    code: string,
    f: (program: Program, result: SymbolAnalysisResult) => void
) {
    test(`${desc}: '${code}'`, () => {
        const ast = parse(getScanner(lex(code))).unwrapOrPanic((err) => {
            assert(false, err.toString());
        });
        f(ast, analyzeProgram(ast));
    });
}
