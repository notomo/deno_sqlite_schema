export type Schema = Readonly<{
  tables: Table[];
  views: View[];
}>;

export type Table = Readonly<{
  name: string;
  columns: Column[];
  indexes: Index[];
  triggers: Trigger[];
  isStrict: boolean;
  withoutRowId: boolean;
}>;

export type Column = Readonly<{
  name: string;
  typeName: string;
  typeAffinity: ColumnTypeAffinity;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isAutoIncrement: boolean;
  defaultExpression?: string;
}>;

export type Index = Readonly<{
  name: string;
  isUnique: boolean;
  isPartial: boolean;
  columns: IndexColumn[];
}>;

export type IndexColumn = Readonly<{
  name: string;
  isDescending: boolean;
  collation: string;
}>;

export type Trigger = Readonly<{
  name: string;
}>;

export type View = Readonly<{
  name: string;
  columns: ViewColumn[];
}>;

export type ViewColumn = Readonly<{
  name: string;
  originalName?: string;
  tableName?: string;
}>;

export type ColumnTypeAffinity =
  | "TEXT"
  | "NUMERIC"
  | "INTEGER"
  | "REAL"
  | "BLOB";
