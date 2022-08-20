import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
import {
  ColumnTypeAffinity,
  Index,
  IndexColumn,
  Schema,
  Table,
} from "./type.ts";

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

type TableListResponse = {
  name: string;
  type: string;
  strict: 0 | 1;
  wr: 0 | 1;
};

function fetchTables(db: DB, sql: string): Table[] {
  db.execute(sql);

  const responseMap = db.queryEntries<TableListResponse>(`PRAGMA table_list`)
    .filter((e) => e.type === "table")
    .reduce((map, e) => {
      map.set(e.name, e);
      return map;
    }, new Map<string, TableListResponse>());

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
    .map((e) => {
      const tableListResponse = responseMap.get(e.name);
      if (tableListResponse === undefined) {
        throw new Error(
          `unexpected table_list response: table = ${e.name}`,
        );
      }
      return fetchTable(db, tableListResponse, e.sql);
    });
}

function fetchTable(
  db: DB,
  tableListResponse: TableListResponse,
  tableSQL: string,
): Table {
  const tableName = tableListResponse.name;
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
    indexes: fetchIndexes(db, tableName),
    isStrict: tableListResponse?.strict === 1,
    withoutRowId: tableListResponse?.wr === 1,
  };
}

export function fetchIndexes(db: DB, tableName: string): Index[] {
  const entries = db.queryEntries<
    {
      name: string;
      unique: 0 | 1;
      partial: 0 | 1;
    }
  >(
    `PRAGMA index_list("${tableName}")`,
  );
  return entries.map((e) => {
    return {
      name: e.name,
      isUnique: e.unique === 1,
      isPartial: e.partial === 1,
      columns: fetchIndexColumns(db, e.name),
    };
  });
}

export function fetchIndexColumns(
  db: DB,
  indexName: string,
): IndexColumn[] {
  const entries = db.queryEntries<
    {
      name: string | null;
      desc: 0 | 1;
      coll: string;
    }
  >(
    `PRAGMA index_xinfo("${indexName}")`,
  );
  return entries
    .map((e): IndexColumn | undefined => {
      if (e.name === null) {
        return undefined;
      }
      return {
        name: e.name,
        isDescending: e.desc === 1,
        collation: e.coll,
      };
    })
    .filter((c): c is IndexColumn => c !== undefined);
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
