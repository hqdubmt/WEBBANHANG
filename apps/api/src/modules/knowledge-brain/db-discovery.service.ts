import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DbDiscoveryService {
  constructor(private readonly dataSource: DataSource) {}

  async scanTables() {
    return this.dataSource.query<any[]>(`
      SELECT
        t.table_name,
        COUNT(c.column_name)::int AS column_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c
        ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);
  }

  async scanRelationships() {
    return this.dataSource.query<any[]>(`
      SELECT
        tc.table_name    AS from_table,
        kcu.column_name  AS from_column,
        ccu.table_name   AS to_table,
        ccu.column_name  AS to_column,
        tc.constraint_name
      FROM information_schema.table_constraints   tc
      JOIN information_schema.key_column_usage     kcu
        ON  tc.constraint_name = kcu.constraint_name
        AND tc.table_schema    = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON  ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema    = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);
  }

  async getMetadataRegistry() {
    const [tables, relationships] = await Promise.all([
      this.scanTables(),
      this.scanRelationships(),
    ]);

    const relMap: Record<string, { column: string; references: string }[]> = {};
    for (const rel of relationships) {
      if (!relMap[rel.from_table]) relMap[rel.from_table] = [];
      relMap[rel.from_table].push({
        column: rel.from_column,
        references: `${rel.to_table}.${rel.to_column}`,
      });
    }

    const registry = tables.map((t) => ({
      table: t.table_name,
      columnCount: t.column_count,
      relationships: relMap[t.table_name] ?? [],
    }));

    return {
      totalTables: tables.length,
      totalRelationships: relationships.length,
      registry,
      graph: {
        nodes: tables.map((t) => ({ id: t.table_name, columns: t.column_count })),
        edges: relationships.map((r) => ({
          from: r.from_table,
          to: r.to_table,
          via: `${r.from_column} → ${r.to_column}`,
        })),
      },
    };
  }

  async getTableDetail(tableName: string) {
    const [columns, indexes] = await Promise.all([
      this.dataSource.query<any[]>(
        `SELECT
           column_name,
           data_type,
           is_nullable,
           column_default,
           character_maximum_length,
           ordinal_position
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName],
      ),
      this.dataSource.query<any[]>(
        `SELECT
           i.relname                                                       AS index_name,
           ix.indisunique                                                  AS is_unique,
           array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
         FROM pg_class t
         JOIN pg_index     ix ON t.oid = ix.indrelid
         JOIN pg_class     i  ON i.oid = ix.indexrelid
         JOIN pg_attribute a  ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
         WHERE t.relname = $1
         GROUP BY i.relname, ix.indisunique
         ORDER BY i.relname`,
        [tableName],
      ),
    ]);

    return { table: tableName, columns, indexes };
  }
}
