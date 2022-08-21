import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
import * as types from "./type.ts";

export function extract(sql: string): types.Schema {
  const db = new DB();
  try {
    db.execute(sql);
    return {
      tables: fetchTables(db),
      views: fetchViews(db),
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

function fetchTables(db: DB): types.Table[] {
  const responseMap = db.queryEntries<TableListResponse>(`PRAGMA table_list`)
    .filter((e) => e.type === "table")
    .reduce((map, e) => {
      map.set(e.name, e);
      return map;
    }, new Map<string, TableListResponse>());

  const entries = db
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
    );

  return entries
    .map((e): types.Table => {
      const tableListResponse = responseMap.get(e.name);
      if (tableListResponse === undefined) {
        throw new Error(
          `unexpected table_list response: table = ${e.name}`,
        );
      }
      const tableName = tableListResponse.name;
      return {
        name: tableName,
        columns: fetchTableColumns(db, tableName, e.sql),
        indexes: fetchIndexes(db, tableName),
        triggers: fetchTriggers(db, tableName),
        isStrict: tableListResponse?.strict === 1,
        withoutRowId: tableListResponse?.wr === 1,
      };
    });
}

function fetchTableColumns(
  db: DB,
  tableName: string,
  tableSQL: string,
): types.Column[] {
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
  return entries.map((e): types.Column => {
    return {
      name: e.name,
      typeName: e.type,
      typeAffinity: typeNameToAffinity(e.type),
      isPrimaryKey: e.pk === 1,
      isNullable: e.notnull === 0,
      isAutoIncrement: tableSQL.match(`${e.name} [^,]+AUTOINCREMENT`) !== null,
      defaultExpression: e.dflt_value ?? undefined,
    };
  });
}

export function fetchIndexes(db: DB, tableName: string): types.Index[] {
  const entries = db.queryEntries<
    {
      name: string;
      unique: 0 | 1;
      partial: 0 | 1;
    }
  >(
    `PRAGMA index_list("${tableName}")`,
  );
  return entries.map((e): types.Index => {
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
): types.IndexColumn[] {
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

function fetchTriggers(db: DB, tableName: string): types.Trigger[] {
  const entries = db
    .queryEntries<{
      name: string;
      sql: string;
    }>(
      `
SELECT
  name
FROM sqlite_schema
WHERE
  type = 'trigger'
  AND tbl_name = :tableName
`,
      {
        tableName: tableName,
      },
    );
  return entries
    .map((e) => {
      return {
        name: e.name,
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

function fetchViews(db: DB): types.View[] {
  const entries = db
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
  type = 'view'
`,
    );
  return entries
    .map((e): types.View => {
      return {
        name: e.name,
        columns: fetchViewColumns(db, e.sql),
      };
    });
}

function fetchViewColumns(
  db: DB,
  viewSQL: string,
): types.ViewColumn[] {
  const selectSQL = extractSelectSQL(viewSQL);
  const query = db.prepareQuery(selectSQL);
  const columns = query.columns()
    .map((c): types.ViewColumn => {
      return {
        name: c.name,
        originalName: c.originName !== "" ? c.originName : undefined,
        tableName: c.tableName !== "" ? c.tableName : undefined,
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
