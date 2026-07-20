import { buildPaginatedResult } from './pagination.util';

describe('buildPaginatedResult', () => {
  it('wraps items with total/page/pageSize and computes totalPages', () => {
    const result = buildPaginatedResult([{ id: 1 }, { id: 2 }], 45, { page: 2, pageSize: 20 });

    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      meta: { total: 45, page: 2, pageSize: 20, totalPages: 3 },
    });
  });

  it('rounds totalPages up for a partial final page', () => {
    const result = buildPaginatedResult([], 1, { page: 1, pageSize: 20 });
    expect(result.meta.totalPages).toBe(1);
  });

  it('reports zero total pages when there are no results', () => {
    const result = buildPaginatedResult([], 0, { page: 1, pageSize: 20 });
    expect(result.meta.totalPages).toBe(0);
  });
});
