import { buildWorkflowTree, normalizeArchivedResponse } from './archived-workflows-page.component';

describe('buildWorkflowTree', () => {
  it('groups child and grandchild rows under their parent rows', () => {
    const rows = [
      { proc_inst_id_: 'root', super_process_instance_id_: null, root_proc_inst_id_: null },
      { proc_inst_id_: 'child', super_process_instance_id_: 'root', root_proc_inst_id_: 'root' },
      { proc_inst_id_: 'grandchild', super_process_instance_id_: 'child', root_proc_inst_id_: 'root' },
    ];

    const flattened = buildWorkflowTree(rows as Array<Record<string, unknown>>);

    expect(flattened.map((row) => row['proc_inst_id_'])).toEqual(['root', 'child', 'grandchild']);
    expect(flattened[1]['depth']).toBe(1);
    expect(flattened[2]['depth']).toBe(2);
  });
});

describe('normalizeArchivedResponse', () => {
  it('accepts both object payloads and array payloads', () => {
    const rows = [{ proc_inst_id_: 'root' } as Record<string, unknown>];

    expect(normalizeArchivedResponse({ data: rows, total: 1 })).toEqual({ data: rows, total: 1 });
    expect(normalizeArchivedResponse(rows)).toEqual({ data: rows, total: 1 });
  });
});
