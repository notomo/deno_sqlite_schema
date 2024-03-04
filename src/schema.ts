import { Database } from "jsr:@db/sqlite@0.11";
import * as types from "./type.ts";

export function extract(sql: string): types.Schema[] {
  const db = new Database(":memory:");
  try {
    db.exec(sql);
    return fetchSchemas(db);
  } finally {
    db.close();
  }
}

function fetchSchemas(db: Database): types.Schema[] {
  const schemaNames = db
    .prepare(`PRAGMA table_list`)
    .all<{ schema: string }>()
    .filter((e) => e.schema !== "temp")
    .map((e) => e.schema)
    .filter((schemaName, i, self) => self.indexOf(schemaName) === i);

  return schemaNames.map((schemaName): types.Schema => {
    return {
      name: schemaName,
      tables: fetchTables(db, schemaName),
      views: fetchViews(db, schemaName),
    };
  });
}

type TableListResponse = {
  schema: string;
  name: string;
  type: string;
  strict: 0 | 1;
  wr: 0 | 1;
};

function fetchTables(db: Database, schemaName: string): types.Table[] {
  const responseMap = db
    .prepare(`PRAGMA table_list`)
    .all<TableListResponse>()
    .filter((e) => e.schema === schemaName && e.type === "table")
    .reduce((map, e) => {
      map.set(e.name, e);
      return map;
    }, new Map<string, TableListResponse>());

  const entries = db
    .prepare(
      `
SELECT
  name
  ,sql
FROM ${schemaName}.sqlite_schema
WHERE
  type = 'table'
  AND name NOT LIKE 'sqlite\_%'
`,
    )
    .all<{
      name: string;
      sql: string;
    }>();

  return entries.map((e): types.Table => {
    const tableListResponse = responseMap.get(e.name);
    if (tableListResponse === undefined) {
      throw new Error(`unexpected table_list response: table = ${e.name}`);
    }
    const tableName = tableListResponse.name;
    const isStrict = tableListResponse?.strict === 1;
    return {
      name: tableName,
      columns: fetchTableColumns(db, schemaName, tableName, e.sql, isStrict),
      indexes: fetchIndexes(db, schemaName, tableName),
      triggers: fetchTriggers(db, schemaName, tableName),
      foreignKeys: fetchForeignKeys(db, schemaName, tableName),
      isStrict: isStrict,
      withoutRowId: tableListResponse?.wr === 1,
    };
  });
}

function fetchTableColumns(
  db: Database,
  schemaName: string,
  tableName: string,
  tableSQL: string,
  isStrict: boolean,
): types.Column[] {
  const entries = db
    .prepare(`PRAGMA ${schemaName}.table_info("${tableName}")`)
    .all<{
      name: string;
      type: string;
      pk: 0 | 1;
      notnull: 0 | 1;
      dflt_value: string;
    }>();
  return entries.map((e): types.Column => {
    return {
      name: e.name,
      typeName: e.type,
      typeAffinity: typeNameToAffinity(e.type),
      strictType: typeNameToStrict(e.type, isStrict),
      isPrimaryKey: e.pk === 1,
      isNullable: e.notnull === 0,
      isAutoIncrement: tableSQL.match(`${e.name} [^,]+AUTOINCREMENT`) !== null,
      defaultExpression: e.dflt_value ?? undefined,
    };
  });
}

export function fetchIndexes(
  db: Database,
  schemaName: string,
  tableName: string,
): types.Index[] {
  const entries = db
    .prepare(`PRAGMA ${schemaName}.index_list("${tableName}")`)
    .all<{
      name: string;
      unique: 0 | 1;
      partial: 0 | 1;
    }>();
  return entries.map((e): types.Index => {
    return {
      name: e.name,
      isUnique: e.unique === 1,
      isPartial: e.partial === 1,
      columns: fetchIndexColumns(db, schemaName, e.name),
    };
  });
}

export function fetchIndexColumns(
  db: Database,
  schemaName: string,
  indexName: string,
): types.IndexColumn[] {
  const entries = db
    .prepare(`PRAGMA ${schemaName}.index_xinfo("${indexName}")`)
    .all<{
      name: string | null;
      desc: 0 | 1;
      coll: string;
    }>();
  return entries
    .map((e): types.IndexColumn | undefined => {
      if (e.name === null) {
        return undefined;
      }
      return {
        name: e.name,
        isDescending: e.desc === 1,
        collation: e.coll,
      };
    })
    .filter((c): c is types.IndexColumn => c !== undefined);
}

function fetchTriggers(
  db: Database,
  schemaName: string,
  tableName: string,
): types.Trigger[] {
  const entries = db
    .prepare(
      `
SELECT
  name
FROM ${schemaName}.sqlite_schema
WHERE
  type = 'trigger'
  AND tbl_name = :tableName
`,
    )
    .all<{
      name: string;
      sql: string;
    }>({
      tableName: tableName,
    });
  return entries.map((e) => {
    return {
      name: e.name,
    };
  });
}

function fetchForeignKeys(
  db: Database,
  schemaName: string,
  tableName: string,
): types.ForeignKey[] {
  const entries = db
    .prepare(`PRAGMA ${schemaName}.foreign_key_list("${tableName}")`)
    .all<{
      id: number;
      table: string;
      from: string;
      to: string;
      on_update: types.ForeignKeyAction;
      on_delete: types.ForeignKeyAction;
    }>();

  const pairsMap = entries.reduce((map, e) => {
    const pairs = map.get(e.id) ?? [];
    pairs.push({
      nameFrom: e.from,
      nameTo: e.to,
    });
    map.set(e.id, pairs);
    return map;
  }, new Map<number, types.ForeignKeyColumnPair[]>());

  return entries.map((e): types.ForeignKey => {
    const columnPairs = pairsMap.get(e.id);
    if (!columnPairs) {
      throw new Error("unexpected foreign_key_list response");
    }
    return {
      tableName: e.table,
      columnPairs: columnPairs,
      onUpdateAction: e.on_update,
      onDeleteAction: e.on_delete,
    };
  });
}

export function typeNameToAffinity(typeName: string): types.ColumnTypeAffinity {
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

const strictTypeMap: { [K in string]: types.ColumnStrictType } = {
  ["INT"]: "INTEGER",
  ["INTEGER"]: "INTEGER",
  ["TEXT"]: "TEXT",
  ["REAL"]: "REAL",
  ["BLOB"]: "BLOB",
  ["ANY"]: "ANY",
};
export function typeNameToStrict(
  rawType: string,
  isStrict: boolean,
): types.ColumnStrictType | undefined {
  if (!isStrict) {
    return undefined;
  }
  if (rawType in strictTypeMap) {
    return strictTypeMap[rawType];
  }
  throw new Error(`unexpected type for strict: ${rawType}`);
}

function fetchViews(db: Database, schemaName: string): types.View[] {
  const entries = db
    .prepare(
      `
SELECT
  name
  ,sql
FROM ${schemaName}.sqlite_schema
WHERE
  type = 'view'
`,
    )
    .all<{
      name: string;
      sql: string;
    }>();
  return entries.map((e): types.View => {
    const viewName = e.name;
    return {
      name: viewName,
      columns: fetchViewColumns(db, schemaName, viewName, e.sql),
    };
  });
}

function fetchViewColumns(
  db: Database,
  schemaName: string,
  viewName: string,
  viewSQL: string,
): types.ViewColumn[] {
  const columnNameMap = db
    .prepare(`PRAGMA ${schemaName}.table_info("${viewName}")`)
    .all<{ name: string }>()
    .map((e) => e.name)
    .reduce((map, name) => {
      map.set(name, true);
      return map;
    }, new Map<string, boolean>());

  const selectSQL = extractSelectSQL(viewSQL);
  console.log(selectSQL);
  const query = db.prepare(selectSQL);
  const columns = query
    .columnNames()
    .filter((name) => columnNameMap.has(name))
    .map((name): types.ViewColumn => {
      return {
        name: name,
        originalName: name,
        // originalName: c.originName !== "" ? c.originName : undefined,
        // tableName: c.tableName !== "" ? c.tableName : undefined,
      };
    });
  query.finalize();
  return columns;
}

const sqlAsRegex = /\s+as\s+/i;
function extractSelectSQL(viewSQL: string): string {
  const match = sqlAsRegex.exec(viewSQL);
  if (!match) {
    throw new Error(`unexpected create view sql: ${viewSQL}`);
  }
  return viewSQL.slice(match.index + match[0].length);
}
