import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ArchiveRepository } from '../src/modules/archive/archive.repository';

class MockPool {
  constructor(
    private readonly existingTables: Iterable<string>,
    private readonly tableColumnsByName: Record<string, string[]> = {},
  ) {}

  query = async (text: string, params?: unknown[]) => {
    if (text.includes('information_schema.tables')) {
      const tableName = String(params?.[0] ?? '');
      return { rows: [{ exists: [...this.existingTables].includes(tableName) }] };
    }
    if (text.includes('information_schema.columns')) {
      const tableName = String(params?.[0] ?? '');
      return { rows: (this.tableColumnsByName[tableName] ?? []).map((column_name) => ({ column_name })) };
    }
    if (text.includes('create table')) {
      return { rows: [] };
    }
    if (text.includes('alter table')) {
      return { rows: [] };
    }
    return { rows: [] };
  };
}

async function main() {
  const sourcePool = new MockPool(['act_hi_procinst', 'act_hi_taskinst', 'act_hi_dec_in', 'act_hi_dec_out']);
  const targetPool = new MockPool(['act_hi_procinst', 'act_hi_taskinst', 'act_hi_dec_in', 'act_hi_dec_out']);
  const repository = new ArchiveRepository(sourcePool as any, targetPool as any);

  const pairs = await (repository as any).resolveHistoryTablePairs(sourcePool, targetPool);

  assert.equal(pairs.length, 4, 'only existing source tables should be planned for archive');
  assert.deepEqual(pairs[0], ['act_hi_procinst', 'act_hi_procinst']);
  assert.deepEqual(pairs[1], ['act_hi_taskinst', 'act_hi_taskinst']);
  assert.deepEqual(pairs[2], ['act_hi_dec_in', 'act_hi_dec_in']);
  assert.deepEqual(pairs[3], ['act_hi_dec_out', 'act_hi_dec_out']);

  const sourceColumnsWithExtra = new MockPool(
    ['act_hi_procinst'],
    { act_hi_procinst: ['id_', 'proc_inst_id_', 'restarted_proc_inst_id_'] },
  );
  const targetColumnsWithoutExtra = new MockPool(
    ['act_hi_procinst'],
    { act_hi_procinst: ['id_', 'proc_inst_id_'] },
  );
  const columnScopedRepository = new ArchiveRepository(sourceColumnsWithExtra as any, targetColumnsWithoutExtra as any);
  const targetColumns = await (columnScopedRepository as any).tableColumns(targetColumnsWithoutExtra, 'act_hi_procinst');
  const row = { id_: '1', proc_inst_id_: 'proc-1', restarted_proc_inst_id_: 'restart-1' };
  const insertableColumns = (columnScopedRepository as any).insertableColumns(row, targetColumns);
  assert.deepEqual(insertableColumns, ['id_', 'proc_inst_id_'], 'target columns should be used for insertable columns');

  const bytearrayFilter = await (columnScopedRepository as any).processFilter(sourceColumnsWithExtra, 'act_ge_bytearray', true);
  assert.ok(bytearrayFilter.includes('from act_hi_varinst'), 'bytearray filter should use the shared history table names');
  assert.ok(!bytearrayFilter.includes('from arc_'), 'bytearray filter should not use prefixed archive table names');

  const schemaPath = path.resolve(__dirname, '../../../infra/db/001_archive_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const expectedTables = [
    'act_hi_procinst',
    'act_hi_actinst',
    'act_hi_taskinst',
    'act_hi_varinst',
    'act_hi_detail',
    'act_hi_incident',
    'act_hi_job_log',
    'act_hi_op_log',
    'act_hi_attachment',
    'act_hi_comment',
    'act_hi_identitylink',
    'act_hi_caseinst',
    'act_hi_caseactinst',
    'act_hi_decinst',
    'act_hi_dec_in',
    'act_hi_dec_out',
    'act_hi_ext_task_log',
    'act_hi_batch',
    'act_ge_bytearray',
  ];

  for (const tableName of expectedTables) {
    assert.ok(schemaSql.includes(`CREATE TABLE IF NOT EXISTS ${tableName} (`), `${tableName} should be defined in the archive schema`);
  }

  console.log('archive repository table plan test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
