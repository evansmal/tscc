import { Result, Ok, Err } from "./common.js";

export type TokenType =
    | "identifier"
    | "return"
    | "oparen"
    | "cparen"
    | "obrace"
    | "cbrace"
    | "obracket"
    | "cbracket"
    | "float"
    | "int"
    | "semicolon"
    | "string"
    | "bitwise_complement"
    | "decrement"
    | "negation"
    | "logical_not"
    | "logical_and"
    | "logical_or"
    | "equal_to"
    | "not_equal_to"
    | "less_than"
    | "less_than_or_equal"
    | "greater_than"
    | "greater_than_or_equal"
    | "plus"
    | "asterisk"
    | "forward_slash"
    | "percent"
    | "comment"
    | "assignment"
    | "if"
    | "eof";

export interface Token {
    kind: TokenType;
    value: string;
    position: number;
}

export function ToString(token: Token): string {
    return `${token.kind} [${token.value}@${token.position}]`;
}

function readToken(input: string, position: number): Result<Token, string> {
    const patterns: [TokenType, RegExp][] = [
        ["return", /^(return)\w*/],
        ["if", /^(if)\w*/],
        ["identifier", /^[a-zA-Z_]\w*/],
        ["bitwise_complement", /^\~/],
        ["decrement", /^\--/],
        ["negation", /^\-/],
        ["oparen", /^\(/],
        ["cparen", /^\)/],
        ["float", /^-?\d+\.\d+/],
        ["int", /^-?\d+/],
        ["obrace", /^\{/],
        ["cbrace", /^\}/],
        ["obracket", /^\[/],
        ["cbracket", /^\]/],
        ["semicolon", /^\;/],
        ["equal_to", /^\=\=/],
        ["not_equal_to", /^\!\=/],
        ["less_than_or_equal", /^\<\=/],
        ["less_than", /^\</],
        ["greater_than_or_equal", /^\>\=/],
        ["greater_than", /^\>/],
        ["string", /^"(\\\\|\\"|[^"])*"/],
        ["logical_not", /^\!/],
        ["logical_and", /^\&\&/],
        ["logical_or", /^\|\|/],
        ["plus", /^\+/],
        ["asterisk", /^\*/],
        ["forward_slash", /^\//],
        ["percent", /^\//],
        ["comment", /^\/\/.*/],
        ["assignment", /^\=/]
    ];
    for (let i = 0; i < patterns.length; i++) {
        const [kind, regex] = patterns[i];
        const result = input.slice(position).match(regex);
        if (result !== null) {
            const text = result[0];
            return Ok({ kind, value: text, position });
        }
    }
    return Err("Did not match token");
}

export function lex(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    while (pos < input.length) {
        const token = readToken(input, pos);
        if (token.isOk()) {
            tokens.push(token.unwrap());
            pos += token.unwrap().value.length;
        } else {
            // We didn't match anything so just skip ahead
            pos += 1;
        }
    }
    return tokens;
}

export interface Scanner {
    next(): Token;
    peek(): Token;
}

export function getScanner(tokens: Token[]): Scanner {
    let pos = 0;
    return {
        next: () => {
            if (pos >= tokens.length)
                return { kind: "eof", value: "", position: pos };
            else return tokens[pos++];
        },
        peek: () => {
            if (pos === tokens.length)
                return { kind: "eof", value: "", position: pos };
            else return tokens[pos];
        }
    };
}
