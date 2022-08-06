import { extract } from "../mod.ts";

const schema = extract(`
CREATE TABLE IF NOT EXISTS issue (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
console.log(JSON.stringify(schema, null, 2));
