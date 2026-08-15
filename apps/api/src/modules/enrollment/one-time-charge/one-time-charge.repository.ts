import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';

@Injectable()
export class OneTimeChargeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * OneTimeChargeService owns no table of its own (§3: "produces
   * InvoiceLineItem rows... via ManualOverrideService"), but
   * withTenantContext calls still live in a repository, not a service,
   * matching every other module's convention - mirrors
   * BillingRunRepository.runInTransaction exactly.
   */
  runInTransaction<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return withTenantContext(this.prisma, tenantId, fn);
  }
}
