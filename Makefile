test:
	deno test --allow-env --allow-read --allow-write --allow-net --allow-ffi --unstable-ffi

check:
	deno fmt --check
	deno check **/*.ts
	deno lint

doc:
	deno run --allow-run --allow-read --allow-write ./script/generate_readme.ts ./script/example.ts ./README.md

publish:
	deno publish
