import { ManualOverrideRepository } from './manual-override.repository';
import { ManualOverrideService } from './manual-override.service';

describe('ManualOverrideService', () => {
  it('delegates record to the repository with the caller-supplied tx and tenantId', async () => {
    const repository = { record: jest.fn().mockResolvedValue({ id: 'override-1' }) } as unknown as jest.Mocked<ManualOverrideRepository>;
    const service = new ManualOverrideService(repository);

    const data = {
      overrideType: 'ONE_TIME_CHARGE',
      reasonCode: 'GOODWILL',
      relatedEntityType: 'InvoiceLineItem',
      relatedEntityId: 'line-1',
      previousValue: null,
      newValue: '{}',
    };

    const result = await service.record('tx' as never, 'tenant-1', data, 'user-1');

    expect(repository.record).toHaveBeenCalledWith('tx', 'tenant-1', data, 'user-1');
    expect(result).toEqual({ id: 'override-1' });
  });
});
