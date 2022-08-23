import { extract, typeNameToAffinity, typeNameToStrict } from "./schema.ts";
import {
  assertEquals,
  assertObjectMatch,
  assertThrows,
} from "https://deno.land/std@0.149.0/testing/asserts.ts";

Deno.test("extract", async (t) => {
  await t.step("can use empty string", () => {
    const gots = extract("");
    const wants = [
      {
        name: "main",
        tables: [],
        views: [],
      },
    ];
    for (const i in wants) {
      const want = wants[i];
      const got = gots[i];
      assertObjectMatch(want, got);
    }
  });

  await t.step("returns schema", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example1 (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, description TEXT);

CREATE TABLE IF NOT EXISTS example2 (
  id INTEGER NOT NULL,
  number REAL NOT NULL,
  image BLOB NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES example1(id) ON DELETE CASCADE ON UPDATE SET NULL
) STRICT;

CREATE TABLE IF NOT EXISTS example3 (
  name TEXT NOT NULL PRIMARY KEY
) WITHOUT ROWID;

CREATE TRIGGER IF NOT EXISTS example3Check
BEFORE INSERT ON example3
BEGIN
  SELECT RAISE(FAIL, 'error')
  FROM example3
  WHERE name = 'test';
END;

CREATE UNIQUE INDEX IF NOT EXISTS example2_number ON example2(number, createdAt COLLATE NOCASE DESC) WHERE number > 10;

CREATE VIEW IF NOT EXISTS joined
AS
  SELECT
    e1.id AS e1Id,
    e2.image,
    1
  FROM example1 AS e1
  INNER JOIN example2 e2 ON e1.id = e2.id;

`,
    );
    const wants = [
      {
        name: "main",
        tables: [
          {
            name: "example1",
            columns: [
              {
                name: "id",
                typeName: "INTEGER",
                typeAffinity: "INTEGER",
                strictType: undefined,
                isPrimaryKey: true,
                isNullable: false,
                isAutoIncrement: true,
                defaultExpression: undefined,
              },
              {
                name: "description",
                typeName: "TEXT",
                typeAffinity: "TEXT",
                strictType: undefined,
                isPrimaryKey: false,
                isNullable: true,
                isAutoIncrement: false,
                defaultExpression: undefined,
              },
            ],
            indexes: [],
            triggers: [],
            foreignKeys: [],
            isStrict: false,
            withoutRowId: false,
          },
          {
            name: "example2",
            columns: [
              {
                name: "id",
                typeName: "INTEGER",
                typeAffinity: "INTEGER",
                strictType: "INTEGER",
                isPrimaryKey: false,
                isNullable: false,
                isAutoIncrement: false,
                defaultExpression: undefined,
              },
              {
                name: "number",
                typeName: "REAL",
                typeAffinity: "REAL",
                strictType: "REAL",
                isPrimaryKey: false,
                isNullable: false,
                isAutoIncrement: false,
                defaultExpression: undefined,
              },
              {
                name: "image",
                typeName: "BLOB",
                typeAffinity: "BLOB",
                strictType: "BLOB",
                isPrimaryKey: false,
                isNullable: false,
                isAutoIncrement: false,
                defaultExpression: undefined,
              },
              {
                name: "createdAt",
                typeName: "TEXT",
                typeAffinity: "TEXT",
                strictType: "TEXT",
                isPrimaryKey: false,
                isNullable: false,
                isAutoIncrement: false,
                defaultExpression: "CURRENT_TIMESTAMP",
              },
            ],
            indexes: [
              {
                name: "example2_number",
                isUnique: true,
                isPartial: true,
                columns: [
                  {
                    name: "number",
                    isDescending: false,
                    collation: "BINARY",
                  },
                  {
                    name: "createdAt",
                    isDescending: true,
                    collation: "NOCASE",
                  },
                ],
              },
            ],
            triggers: [],
            foreignKeys: [
              {
                tableName: "example1",
                columnPairs: [
                  {
                    nameFrom: "id",
                    nameTo: "id",
                  },
                ],
                onDeleteAction: "CASCADE",
                onUpdateAction: "SET NULL",
              },
            ],
            isStrict: true,
            withoutRowId: false,
          },
          {
            name: "example3",
            columns: [
              {
                name: "name",
                typeName: "TEXT",
                typeAffinity: "TEXT",
                strictType: undefined,
                isPrimaryKey: true,
                isNullable: false,
                isAutoIncrement: false,
                defaultExpression: undefined,
              },
            ],
            indexes: [
              {
                columns: [
                  {
                    collation: "BINARY",
                    isDescending: false,
                    name: "name",
                  },
                ],
                isPartial: false,
                isUnique: true,
                name: "sqlite_autoindex_example3_1",
              },
            ],
            triggers: [
              {
                name: "example3Check",
              },
            ],
            foreignKeys: [],
            isStrict: false,
            withoutRowId: true,
          },
        ],
        views: [
          {
            name: "joined",
            columns: [
              {
                name: "e1Id",
                originalName: "id",
                tableName: "example1",
              },
              {
                name: "image",
                originalName: "image",
                tableName: "example2",
              },
              {
                name: "1",
                originalName: undefined,
                tableName: undefined,
              },
            ],
          },
        ],
      },
    ];
    for (const i in wants) {
      const want = wants[i];
      const got = gots[i];
      assertObjectMatch(want, got);
    }
  });
});

Deno.test("typeNameToAffinity", async (t) => {
  const cases = [
    { typeName: "INTEGER", want: "INTEGER" },
    { typeName: "BIGINT", want: "INTEGER" },
    { typeName: "TEXT", want: "TEXT" },
    { typeName: "VARCHAR", want: "TEXT" },
    { typeName: "CLOB", want: "TEXT" },
    { typeName: "BLOB", want: "BLOB" },
    { typeName: "REAL", want: "REAL" },
    { typeName: "FLOAT", want: "REAL" },
    { typeName: "DOUBLE", want: "REAL" },
    { typeName: "OTHER", want: "NUMERIC" },
  ];
  for (const e of cases) {
    await t.step(`${e.typeName} => ${e.want}`, () => {
      const got = typeNameToAffinity(e.typeName);
      assertEquals(got, e.want);
    });
  }
});

Deno.test("typeNameToStrict", async (t) => {
  const cases = [
    { isStrict: true, typeName: "INT", want: "INTEGER" },
    { isStrict: true, typeName: "INTEGER", want: "INTEGER" },
    { isStrict: false, typeName: "INTEGER", want: undefined },
  ];
  for (const e of cases) {
    await t.step(
      `${e.typeName} => ${e.want} (isStrict = ${e.isStrict})`,
      () => {
        const got = typeNameToStrict(e.typeName, e.isStrict);
        assertEquals(got, e.want);
      },
    );
  }

  await t.step(`throws if type name is invalid`, () => {
    assertThrows(() => typeNameToStrict("INVALID_TYPE", true));
  });
});
