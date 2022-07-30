import { extract, typeNameToAffinity } from "./schema.ts";
import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.149.0/testing/asserts.ts";

Deno.test("extract", async (t) => {
  await t.step("can use empty string", () => {
    const got = extract("");
    const want = { tables: [] };
    assertObjectMatch(want, got);
  });

  await t.step("returns schema", () => {
    const got = extract(
      `
CREATE TABLE IF NOT EXISTS example1 (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, description TEXT);

CREATE TABLE IF NOT EXISTS example2 (
  id INTEGER NOT NULL,
  number REAL NOT NULL,
  image BLOB NOT NULL
);
`,
    );
    const want = {
      tables: [
        {
          name: "example1",
          columns: [
            {
              name: "id",
              typeName: "INTEGER",
              typeAffinity: "INTEGER",
              isPrimaryKey: true,
              isNullable: false,
              isAutoIncrement: true,
            },
            {
              name: "description",
              typeName: "TEXT",
              typeAffinity: "TEXT",
              isPrimaryKey: false,
              isNullable: true,
              isAutoIncrement: false,
            },
          ],
        },
        {
          name: "example2",
          columns: [
            {
              name: "id",
              typeName: "INTEGER",
              typeAffinity: "INTEGER",
              isPrimaryKey: false,
              isNullable: false,
              isAutoIncrement: false,
            },
            {
              name: "number",
              typeName: "REAL",
              typeAffinity: "REAL",
              isPrimaryKey: false,
              isNullable: false,
              isAutoIncrement: false,
            },
            {
              name: "image",
              typeName: "BLOB",
              typeAffinity: "BLOB",
              isPrimaryKey: false,
              isNullable: false,
              isAutoIncrement: false,
            },
          ],
        },
      ],
    };
    assertObjectMatch(want, got);
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
