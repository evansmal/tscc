# tscc

##### A toy [C](https://en.wikipedia.org/wiki/C_(programming_language)) compiler written in TypeScript.

![Build](https://github.com/evansmal/tscc/actions/workflows/main.yml/badge.svg)

## Getting Started

Start by cloning the repository and installing the dependencies:

```sh
git clone --recurse-submodules https://github.com/evansmal/tscc.git
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
yarn build && yarn test <stage>
```

Where the stage is an integer value from 1 - 10. Currently, we pass test stages 1 - 3.

## References

- [A Review of Assembly Language](http://www.scs.stanford.edu/nyu/04fa/notes/l2.pdf)

- [Writing a C Compiler](https://norasandler.com/2017/11/29/Write-a-Compiler.html)
