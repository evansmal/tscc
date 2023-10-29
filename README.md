# tscc

##### A toy [C](https://en.wikipedia.org/wiki/C_(programming_language)) compiler written in TypeScript.

![Build](https://github.com/evansmal/tscc/actions/workflows/main.yml/badge.svg)

I created this project to improve my knowledge of compilers and the C programming language. My goal is to keep the source code simple and readable while eventually reaching the point where it can compile non-trivial code. Like many others - I was inspired by the incremental approach from [this](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf) paper by Abdulaziz Ghuloum.

## Getting Started

Start by cloning the repository and installing the dependencies:

```sh
git clone https://github.com/evansmal/tscc.git
cd tscc && yarn install
```

Next, build the project:

```sh
yarn build
```

Run the compiler:

```sh
./tscc main.c
```

## Unit Testing

Fow now, this project uses [this](https://github.com/nlsandler/write_a_c_compiler) test suite for basic verification. You can run it using `yarn`:

```sh
yarn test <stage>
```

Where the stage is an integer value from 1 - 10. Currently, we pass test stages 1 - 7.

There are also some unit tests that rely on the NodeJS test runner. These can be run with the following command:

```sh
yarn test:unit
```

## References

- [An Incremental Approach to Compiler Construction](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf)

- [chibicc: A Small C Compiler](https://github.com/rui314/chibicc)

- [tcc: Tiny C Compiler](https://bellard.org/tcc)

- [A Review of Assembly Language](http://www.scs.stanford.edu/nyu/04fa/notes/l2.pdf)

- [Writing a C Compiler](https://norasandler.com/2017/11/29/Write-a-Compiler.html)
