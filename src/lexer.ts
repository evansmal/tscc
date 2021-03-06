
export type TokenType = "identifier" | "return" | "oparen"
    | "cparen" | "obrace" | "cbrace"
    | "obracket" | "cbracket" | "float"
    | "int" | "semicolon" | "string"
    | "bitwise_complement" | "decrement" | "negation"
    | "logical_not" | "logical_and" | "plus"
    | "asterisk" | "forward_slash" | "percent"
    | "comment" | "eof";

export interface Token {
    kind: TokenType
    value: string;
    position: number;
};

export function ToString(token: Token): string {
    return `${token.kind} [${token.value}@${token.position}]`;
}

function readToken(input: string, position: number): Token | undefined {
    const patterns: [TokenType, RegExp][] = [
        ["return", /^(return)\w*/],
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
        ["string", /^"(\\\\|\\"|[^"])*"/],
        ["logical_not", /^\!/],
        ["logical_and", /^\&&/],
        ["plus", /^\+/],
        ["asterisk", /^\*/],
        ["forward_slash", /^\//],
        ["percent", /^\//],
        ["comment", /^\/\/.*/],
    ];
    for (let i = 0; i < patterns.length; i++) {
        const [kind, regex] = patterns[i];
        const result = input.slice(position).match(regex);
        if (result !== null) {
            const text = result[0];
            return { kind, value: text, position };
        }
    }
}

export function lex(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    while (pos < input.length) {
        const token = readToken(input, pos);
        if (token) { tokens.push(token); pos += token.value.length }
        else { pos += 1 }
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
            if (pos >= tokens.length) return { kind: "eof", value: "", position: pos };
            else return tokens[pos++];
        },
        peek: () => {
            if (pos === tokens.length) return { kind: "eof", value: "", position: pos };
            else return tokens[pos];
        }
    }
}
