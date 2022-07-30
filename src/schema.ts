import { DB, Row } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
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

  const query = db.prepareQuery<Row, {
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
  );
  const tables = query.allEntries().map((e) => fetchTable(db, e.name, e.sql));
  query.finalize();
  return tables;
}

function fetchTable(db: DB, tableName: string, tableSQL: string): Table {
  const query = db.prepareQuery<
    Row,
    {
      name: string;
      type: string;
      pk: 0 | 1;
      notnull: 0 | 1;
    }
  >(
    `PRAGMA table_info("${tableName}")`,
  );
  const table = {
    name: tableName,
    columns: query.allEntries().map((e) => {
      return {
        name: e.name,
        typeName: e.type,
        typeAffinity: typeNameToAffinity(e.type),
        isPrimaryKey: e.pk === 1,
        isNullable: e.notnull === 0,
        isAutoIncrement:
          tableSQL.match(`${e.name} [^,]+AUTOINCREMENT`) !== null,
      };
    }),
  };
  query.finalize();
  return table;
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
