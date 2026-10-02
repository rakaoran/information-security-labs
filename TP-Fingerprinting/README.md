# TP-Fingerprinting

A small local browser-fingerprinting lab implemented with Deno, TypeScript and Express. It
collects passive request headers, active browser properties, a basic typing sample and a
SHA-256 fingerprint. Nothing is stored in a database or cookie.

## Run it

You need [Deno](https://deno.com/) 2.x.

```sh
deno task start
```

Then open <http://127.0.0.1:8000>. Use `deno task dev` while editing.

Useful checks:

```sh
deno task check
deno task fmt
```

The write-up, observations and included evidence are in [REPORT.md](REPORT.md).

> This is a classroom demo. Run it only on local/authorized browsers.
