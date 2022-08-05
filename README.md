# deno_sqlite_schema

This is a deno module to extract sqlite's schema info.

## USAGE

```typescript
import { extract } from "https://deno.land/x/sqlite_schema/mod.ts";

const schema = extract(`
CREATE TABLE IF NOT EXISTS issue (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT
);
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
        }
      ]
    }
  ]
}
```
