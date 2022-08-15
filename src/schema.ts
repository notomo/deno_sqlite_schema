import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
import { ColumnTypeAffinity, Schema, Table } from "./type.ts";

export function extract(sql: string): Schema {
  const db = new DB();
  try {
    return {
      tables: fetchTables(db, sql),
    };
  } finally {
    db.close();
  }
}

function fetchTables(db: DB, sql: string): Table[] {
  db.execute(sql);

  return db
    .queryEntries<{
      name: string;
      sql: string;
    }>(
      `
SELECT
  name
  ,sql
FROM sqlite_schema
WHERE
  type = 'table'
  AND name NOT LIKE 'sqlite\_%'
`,
    )
    .map((e) => fetchTable(db, e.name, e.sql));
}

function fetchTable(db: DB, tableName: string, tableSQL: string): Table {
  const entries = db.queryEntries<
    {
      name: string;
      type: string;
      pk: 0 | 1;
      notnull: 0 | 1;
      dflt_value: string;
    }
  >(
    `PRAGMA table_info("${tableName}")`,
  );
  return {
    name: tableName,
    columns: entries.map((e) => {
      return {
        name: e.name,
        typeName: e.type,
        typeAffinity: typeNameToAffinity(e.type),
        isPrimaryKey: e.pk === 1,
        isNullable: e.notnull === 0,
        isAutoIncrement:
          tableSQL.match(`${e.name} [^,]+AUTOINCREMENT`) !== null,
        defaultExpression: e.dflt_value ?? undefined,
      };
    }),
  };
}

export function typeNameToAffinity(typeName: string): ColumnTypeAffinity {
  if (typeName.includes("INT")) {
    return "INTEGER";
  }
  if (
    typeName.includes("CHAR") ||
    typeName.includes("CLOB") ||
    typeName.includes("TEXT")
  ) {
    return "TEXT";
  }
  if (typeName.includes("BLOB")) {
    return "BLOB";
  }
  if (
    typeName.includes("REAL") ||
    typeName.includes("FLOA") ||
    typeName.includes("DOUB")
  ) {
    return "REAL";
  }
  return "NUMERIC";
}
