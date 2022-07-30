export type Schema = Readonly<{
  tables: Table[];
}>;

export type Table = Readonly<{
  name: string;
  columns: Column[];
}>;

export type Column = Readonly<{
  name: string;
  typeName: string;
  typeAffinity: ColumnTypeAffinity;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isAutoIncrement: boolean;
}>;

export type ColumnTypeAffinity =
  | "TEXT"
  | "NUMERIC"
  | "INTEGER"
  | "REAL"
  | "BLOB";
