async function generateReadme(examplePath: string, outputReadmePath: string) {
  const cmd = [
    "deno",
    "run",
    examplePath,
  ];
  const process = Deno.run({ cmd: cmd, stdout: "piped" });
  await process.status();

  const rawOutput = await process.output();
  process.close();
  const outputJSON = new TextDecoder().decode(rawOutput);

  const rawExample = await Deno.readFile(examplePath);
  const example = new TextDecoder().decode(rawExample).replace(
    `"../mod.ts"`,
    `"https://deno.land/x/sqlite_schema/mod.ts"`,
  );

  const readme = `# deno_sqlite_schema

This is a deno module to extract sqlite's schema info.

## USAGE

\`\`\`typescript
${example}\`\`\`

\`\`\`json
${outputJSON}\`\`\`
`;

  await Deno.writeFile(outputReadmePath, new TextEncoder().encode(readme));
}

await generateReadme(Deno.args[0], Deno.args[1]);
