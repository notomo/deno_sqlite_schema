test:
	deno test

check:
	deno fmt --check
	deno check mod.ts
	deno lint
