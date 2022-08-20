import { extract } from "../mod.ts";

const schema = extract(`
CREATE TABLE IF NOT EXISTS issue (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS issue_createdAt ON issue(createdAt);

CREATE VIEW IF NOT EXISTS describedIssue
AS
  SELECT id, description AS text
  FROM issue
  WHERE description IS NOT NULL
`);
console.log(JSON.stringify(schema, null, 2));
