import { extract } from "../mod.ts";

const schema = extract(`
CREATE TABLE IF NOT EXISTS issue (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tag TEXT NOT NULL,
  FOREIGN KEY (tag) REFERENCES issueTag(name) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS issueTag (
  name TEXT NOT NULL PRIMARY KEY
) STRICT;

CREATE TRIGGER IF NOT EXISTS issueCheck
BEFORE INSERT ON issue
BEGIN
  SELECT RAISE(FAIL, 'error')
  FROM issue
  WHERE title = 'invalid';
END;

CREATE INDEX IF NOT EXISTS issue_createdAt ON issue(createdAt);

CREATE VIEW IF NOT EXISTS describedIssue
AS
  SELECT id, description AS text
  FROM issue
  WHERE description IS NOT NULL
`);
console.log(JSON.stringify(schema, null, 2));
