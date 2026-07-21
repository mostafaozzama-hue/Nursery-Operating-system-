import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { InvoiceConflictError } from './invoice-conflict.error';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  let repository: jest.Mocked<InvoiceRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: InvoiceService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      addLineItem: jest.fn(),
      updateLineItem: jest.fn(),
      removeLineItem: jest.fn(),
      issue: jest.fn(),
      recordPayment: jest.fn(),
      void: jest.fn(),
      findPayments: jest.fn(),
    } as unknown as jest.Mocked<InvoiceRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new InvoiceService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant and user to the repository', async () => {
      const dto = { childId: 'child-1', billedToGuardianId: 'guardian-1' };
      repository.create.mockResolvedValue({ id: 'invoice-1' } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ id: 'invoice-1' });
    });

    it('translates not-found child/guardian into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Child', 'child-1'));
      await expect(service.create({ childId: 'child-1', billedToGuardianId: 'guardian-1' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findMany.mockResolvedValue({
        items: [{ id: 'invoice-1' }, { id: 'invoice-2' }],
        total: 2,
      } as never);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never);

      expect(repository.findMany).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'invoice-1' }, { id: 'invoice-2' }],
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the invoice when found', async () => {
      repository.findOneOrThrow.mockResolvedValue({ id: 'invoice-1' } as never);
      await expect(service.findOne('invoice-1')).resolves.toEqual({ id: 'invoice-1' });
    });

    it('translates EntityNotFoundError into a NotFoundException', async () => {
      repository.findOneOrThrow.mockRejectedValue(new EntityNotFoundError('Invoice', 'invoice-1'));
      await expect(service.findOne('invoice-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('translates a non-draft conflict into a 409', async () => {
      repository.update.mockRejectedValue(new InvoiceConflictError('Only a draft invoice can be edited'));
      await expect(service.update('invoice-1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('addLineItem', () => {
    it('passes tenant, invoiceId, dto, and user to the repository', async () => {
      const dto = { description: 'Tuition', quantity: 1, unitAmount: 500 };
      repository.addLineItem.mockResolvedValue({ id: 'li-1' } as never);

      const result = await service.addLineItem('invoice-1', dto);

      expect(repository.addLineItem).toHaveBeenCalledWith('tenant-1', 'invoice-1', dto, 'user-1');
      expect(result).toEqual({ id: 'li-1' });
    });

    it('translates a non-draft conflict into a 409', async () => {
      repository.addLineItem.mockRejectedValue(
        new InvoiceConflictError('Line items can only be added while the invoice is a draft'),
      );
      await expect(
        service.addLineItem('invoice-1', { description: 'x', quantity: 1, unitAmount: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('issue', () => {
    it('passes through to the repository', async () => {
      repository.issue.mockResolvedValue({ id: 'invoice-1', status: 'ISSUED' } as never);
      const result = await service.issue('invoice-1', {});
      expect(repository.issue).toHaveBeenCalledWith('tenant-1', 'invoice-1', {}, 'user-1');
      expect(result).toEqual({ id: 'invoice-1', status: 'ISSUED' });
    });

    it.each([
      'Only a draft invoice can be issued',
      'Cannot issue an invoice with no line items',
      'A due date is required to issue an invoice',
    ])('translates "%s" into a 409', async (message) => {
      repository.issue.mockRejectedValue(new InvoiceConflictError(message));
      await expect(service.issue('invoice-1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('recordPayment', () => {
    it('passes through to the repository', async () => {
      const dto = { amount: 100, paymentMethod: 'CASH' as const };
      repository.recordPayment.mockResolvedValue({ id: 'payment-1' } as never);

      const result = await service.recordPayment('invoice-1', dto);

      expect(repository.recordPayment).toHaveBeenCalledWith('tenant-1', 'invoice-1', dto, 'user-1');
      expect(result).toEqual({ id: 'payment-1' });
    });

    it('translates an overpayment conflict into a 409', async () => {
      repository.recordPayment.mockRejectedValue(
        new InvoiceConflictError('This payment would exceed the outstanding balance'),
      );
      await expect(
        service.recordPayment('invoice-1', { amount: 999, paymentMethod: 'CASH' as const }),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a wrong-status conflict into a 409', async () => {
      repository.recordPayment.mockRejectedValue(
        new InvoiceConflictError('Payments can only be recorded against an issued invoice'),
      );
      await expect(
        service.recordPayment('invoice-1', { amount: 10, paymentMethod: 'CASH' as const }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('void', () => {
    it('passes through to the repository', async () => {
      repository.void.mockResolvedValue({ id: 'invoice-1', status: 'VOID' } as never);
      const result = await service.void('invoice-1');
      expect(repository.void).toHaveBeenCalledWith('tenant-1', 'invoice-1', 'user-1');
      expect(result).toEqual({ id: 'invoice-1', status: 'VOID' });
    });

    it('translates an already-void conflict into a 409', async () => {
      repository.void.mockRejectedValue(new InvoiceConflictError('This invoice is already void'));
      await expect(service.void('invoice-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findPayments', () => {
    it('returns a paginated result built from the repository output', async () => {
      repository.findPayments.mockResolvedValue({
        items: [{ id: 'payment-1' }],
        total: 1,
      } as never);

      const result = await service.findPayments('invoice-1', {
        page: 1,
        pageSize: 20,
        sortBy: 'paidAt',
        sortOrder: 'desc',
      } as never);

      expect(repository.findPayments).toHaveBeenCalledWith('tenant-1', 'invoice-1', expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        data: [{ id: 'payment-1' }],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      });
    });

    it('translates a not-found invoice into a 404', async () => {
      repository.findPayments.mockRejectedValue(new EntityNotFoundError('Invoice', 'invoice-1'));
      await expect(
        service.findPayments('invoice-1', { page: 1, pageSize: 20, sortBy: 'paidAt', sortOrder: 'desc' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
