test:
	deno test

check:
	deno fmt --check
	deno check mod.ts
	deno lint

doc:
	deno run --allow-run --allow-read --allow-write ./script/generate_readme.ts ./script/example.ts ./README.md
