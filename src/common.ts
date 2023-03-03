export type CompilerError = { message: string };

export function CompilerError(message: string): CompilerError {
    return { message };
}

export const T = Symbol("T");
export const Value = Symbol("Value");

export type Ok<T> = ResultType<T, never>;
export type Err<E> = ResultType<never, E>;
export type Result<T, E> = ResultType<T, E>;

export class ResultType<T, E> {
    private readonly [T]: boolean;
    private readonly [Value]: T | E;

    constructor(val: T | E, ok: boolean) {
        this[Value] = val;
        this[T] = ok;
    }

    isOk(this: Result<T, E>): this is Ok<T> {
        return this[T];
    }

    isErr(this: Result<T, E>): this is Err<E> {
        return !this[T];
    }

    expect(this: Result<T, E>, msg: string): T {
        if (this[T]) {
            return this[Value] as T;
        } else {
            throw new Error(msg);
        }
    }

    unwrap(this: Result<T, E>): T {
        return this.expect("Failed to unwrap Result");
    }

    map<U>(this: Result<T, E>, f: (val: T) => U): Result<U, E> {
        return new ResultType(
            this[T] ? f(this[Value] as T) : (this[Value] as E),
            this[T]
        ) as Result<U, E>;
    }
}

export function Ok<T>(val: T): Ok<T> {
    return new ResultType<T, never>(val, true);
}

export function Err<E>(val: E): Err<E> {
    return new ResultType<never, E>(val, false);
}
