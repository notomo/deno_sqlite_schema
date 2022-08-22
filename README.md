# deno_sqlite_schema

This is a deno module to extract sqlite's schema info.

## USAGE

```typescript
import { extract } from "https://deno.land/x/sqlite_schema/mod.ts";

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
```

```json
{
  "tables": [
    {
      "name": "issue",
      "columns": [
        {
          "name": "id",
          "typeName": "INTEGER",
          "typeAffinity": "INTEGER",
          "isPrimaryKey": true,
          "isNullable": false,
          "isAutoIncrement": true
        },
        {
          "name": "title",
          "typeName": "TEXT",
          "typeAffinity": "TEXT",
          "isPrimaryKey": false,
          "isNullable": false,
          "isAutoIncrement": false
        },
        {
          "name": "description",
          "typeName": "TEXT",
          "typeAffinity": "TEXT",
          "isPrimaryKey": false,
          "isNullable": true,
          "isAutoIncrement": false
        },
        {
          "name": "createdAt",
          "typeName": "TEXT",
          "typeAffinity": "TEXT",
          "isPrimaryKey": false,
          "isNullable": false,
          "isAutoIncrement": false,
          "defaultExpression": "CURRENT_TIMESTAMP"
        },
        {
          "name": "tag",
          "typeName": "TEXT",
          "typeAffinity": "TEXT",
          "isPrimaryKey": false,
          "isNullable": false,
          "isAutoIncrement": false
        }
      ],
      "indexes": [
        {
          "name": "issue_createdAt",
          "isUnique": false,
          "isPartial": false,
          "columns": [
            {
              "name": "createdAt",
              "isDescending": false,
              "collation": "BINARY"
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "issueCheck"
        }
      ],
      "foreignKeys": [
        {
          "tableName": "issueTag",
          "columnPairs": [
            {
              "nameFrom": "tag",
              "nameTo": "name"
            }
          ],
          "onUpdateAction": "CASCADE",
          "onDeleteAction": "NO ACTION"
        }
      ],
      "isStrict": false,
      "withoutRowId": false
    },
    {
      "name": "issueTag",
      "columns": [
        {
          "name": "name",
          "typeName": "TEXT",
          "typeAffinity": "TEXT",
          "strictType": "TEXT",
          "isPrimaryKey": true,
          "isNullable": false,
          "isAutoIncrement": false
        }
      ],
      "indexes": [
        {
          "name": "sqlite_autoindex_issueTag_1",
          "isUnique": true,
          "isPartial": false,
          "columns": [
            {
              "name": "name",
              "isDescending": false,
              "collation": "BINARY"
            }
          ]
        }
      ],
      "triggers": [],
      "foreignKeys": [],
      "isStrict": true,
      "withoutRowId": false
    }
  ],
  "views": [
    {
      "name": "describedIssue",
      "columns": [
        {
          "name": "id",
          "originalName": "id",
          "tableName": "issue"
        },
        {
          "name": "text",
          "originalName": "description",
          "tableName": "issue"
        }
      ]
    }
  ]
}
```
