import { extract, typeNameToAffinity, typeNameToStrict } from "./schema.ts";
import {
  assertEquals,
  assertObjectMatch,
  assertThrows,
} from "https://deno.land/std@0.149.0/testing/asserts.ts";

Deno.test("extract", async (t) => {
  await t.step("can extract empty schema", () => {
    const gots = extract("");
    const wants = [
      {
        name: "main",
        tables: [],
        views: [],
      },
    ];

    assertEquals(gots.length, wants.length);
    for (const i in wants) {
      const want = wants[i];
      const got = gots[i];
      assertObjectMatch(want, got);
    }
  });

  await t.step("can extract schema", () => {
    const gots = extract(`
CREATE TABLE IF NOT EXISTS example (
  id INTEGER NOT NULL,
  number REAL NOT NULL
);
`);
    const wants = [
      {
        name: "main",
        tables: [
          {
            name: "example",
            columns: [
              {
                name: "id",
                typeName: "INTEGER",
                typeAffinity: "INTEGER",
                strictType: undefined,
                isPrimaryKey: false,
                isNullable: false,
                isAutoIncrement: false,
                defaultExpression: undefined,
              },
              {
                name: "number",
                typeName: "REAL",
                typeAffinity: "REAL",
                strictType: undefined,
                isPrimaryKey: false,
                isNullable: false,
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
        ],
        views: [],
      },
    ];

    assertEquals(gots.length, wants.length);
    for (const i in wants) {
      const want = wants[i];
      const got = gots[i];
      assertObjectMatch(want, got);
    }
  });

  await t.step("can extract table", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  id INTEGER NOT NULL
);
`,
    );
    const got = gots[0].tables[0];
    const want = {
      name: "example",
      columns: [
        {
          name: "id",
          typeName: "INTEGER",
          typeAffinity: "INTEGER",
          strictType: undefined,
          isPrimaryKey: false,
          isNullable: false,
          isAutoIncrement: false,
          defaultExpression: undefined,
        },
      ],
      indexes: [],
      triggers: [],
      foreignKeys: [],
      isStrict: false,
      withoutRowId: false,
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract strict table", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  name TEXT
) STRICT;
`,
    );
    const got = gots[0].tables[0];
    const want = {
      name: "example",
      columns: [
        {
          name: "name",
          typeName: "TEXT",
          typeAffinity: "TEXT",
          strictType: "TEXT",
          isPrimaryKey: false,
          isNullable: true,
          isAutoIncrement: false,
          defaultExpression: undefined,
        },
      ],
      indexes: [],
      triggers: [],
      foreignKeys: [],
      isStrict: true,
      withoutRowId: false,
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract without rowid table", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  name TEXT NOT NULL PRIMARY KEY
) WITHOUT ROWID;
`,
    );
    const got = gots[0].tables[0].withoutRowId;
    const want = true;
    assertEquals(got, want);
  });

  await t.step("can extract auto increment column", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example1 (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
);
`,
    );
    const got = gots[0].tables[0].columns[0];
    const want = {
      name: "id",
      typeName: "INTEGER",
      typeAffinity: "INTEGER",
      strictType: undefined,
      isPrimaryKey: true,
      isNullable: false,
      isAutoIncrement: true,
      defaultExpression: undefined,
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract column default expression", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`,
    );
    const got = gots[0].tables[0].columns[0].defaultExpression;
    const want = "CURRENT_TIMESTAMP";
    assertEquals(got, want);
  });

  await t.step("can extract foreign key", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example1 (id INTEGER NOT NULL PRIMARY KEY);

CREATE TABLE IF NOT EXISTS example2 (
  id INTEGER NOT NULL,
  number REAL NOT NULL,
  FOREIGN KEY (id) REFERENCES example1(id) ON DELETE CASCADE ON UPDATE SET NULL
);
`,
    );
    const got = gots[0].tables[1].foreignKeys[0];
    const want = {
      tableName: "example1",
      columnPairs: [
        {
          nameFrom: "id",
          nameTo: "id",
        },
      ],
      onDeleteAction: "CASCADE",
      onUpdateAction: "SET NULL",
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract trigger", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (name TEXT);

CREATE TRIGGER IF NOT EXISTS exampleCheck
BEFORE INSERT ON example
BEGIN
  SELECT RAISE(FAIL, 'error')
  FROM example
  WHERE name = 'test';
END;

`,
    );
    const got = gots[0].tables[0].triggers[0];
    const want = {
      name: "exampleCheck",
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract index", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  number INTEGER,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS example_number ON example(number, createdAt COLLATE NOCASE DESC) WHERE number > 10;
`,
    );
    const got = gots[0].tables[0].indexes[0];
    const want = {
      name: "example_number",
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
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract view that does not specify columns", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  id INTEGER NOT NULL,
  image BLOB NOT NULL
);

CREATE VIEW IF NOT EXISTS joined
AS
  SELECT
    e1.id AS e1Id,
    e1.image,
    1
  FROM example AS e1
`,
    );
    const got = gots[0].views[0];
    const want = {
      name: "joined",
      columns: [
        {
          name: "e1Id",
          originalName: "id",
          tableName: "example",
        },
        {
          name: "image",
          originalName: "image",
          tableName: "example",
        },
        {
          name: "1",
          originalName: undefined,
          tableName: undefined,
        },
      ],
    };
    assertObjectMatch(got, want);
  });

  await t.step("can extract view that specifes columns", () => {
    const gots = extract(
      `
CREATE TABLE IF NOT EXISTS example (
  id INTEGER NOT NULL,
  image BLOB NOT NULL
);

CREATE VIEW IF NOT EXISTS specifiedColumn (id)
AS
  SELECT
    id,
    image
  FROM example
`,
    );
    const got = gots[0].views[0];
    const want = {
      name: "specifiedColumn",
      columns: [
        {
          name: "id",
          originalName: "id",
          tableName: "example",
        },
      ],
    };
    assertObjectMatch(got, want);
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
