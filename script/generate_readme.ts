async function generateReadme(examplePath: string, outputReadmePath: string) {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-env",
      "--allow-read",
      "--allow-ffi",
      "--unstable-ffi",
      examplePath,
    ],
  });

  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    const err = new TextDecoder().decode(stderr);
    throw new Error(err);
  }

  const outputJSON = new TextDecoder().decode(stdout);
  const rawExample = await Deno.readFile(examplePath);
  const example = new TextDecoder()
    .decode(rawExample)
    .replace(`"../mod.ts"`, `"https://deno.land/x/sqlite_schema/mod.ts"`);

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
