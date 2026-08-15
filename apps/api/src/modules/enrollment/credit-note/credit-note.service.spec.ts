import { CreditNoteRepository } from './credit-note.repository';
import { CreditNoteService } from './credit-note.service';

describe('CreditNoteService', () => {
  it('delegates createComposable to the repository with the caller-supplied tx and tenantId', async () => {
    const repository = {
      createComposable: jest.fn().mockResolvedValue({ id: 'credit-note-1' }),
    } as unknown as jest.Mocked<CreditNoteRepository>;
    const service = new CreditNoteService(repository);

    const data = { invoiceId: 'invoice-1', guardianId: 'guardian-1', amount: '100', reasonCode: 'RETROACTIVE_WAIVER' };
    const result = await service.createComposable('tx' as never, 'tenant-1', data, 'user-1');

    expect(repository.createComposable).toHaveBeenCalledWith('tx', 'tenant-1', data, 'user-1');
    expect(result).toEqual({ id: 'credit-note-1' });
  });
});
