import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { CapacityExceededError } from '../../../common/errors/capacity-exceeded.error';
import { findOrThrow } from '../../../common/repository/find-or-throw';

const OCCUPIED_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

/**
 * The single centralized capacity-counting rule, per domain-model.md's
 * Business invariants: "Capacity counting treats SUSPENDED identically to
 * ACTIVE (the seat stays reserved) - evaluated through one centralized
 * query helper, never duplicated inline." Every method is composable -
 * never opens its own transaction, always runs inside the caller's
 * (EnrollmentRepository today; EnrollmentBillingTermsService later), since
 * the capacity decision must be consistent with whatever row the caller
 * has already locked.
 *
 * Deliberately has no dependency of its own (no PrismaService, no other
 * module) - per the frozen Backend Services design's architecture-review
 * correction (backend-services-freeze.md): routing this through
 * EnrollmentRepository would create a circular module dependency, since
 * EnrollmentService already depends on this service for validation.
 */
@Injectable()
export class CapacityService {
  countOccupiedSeats(tx: Prisma.TransactionClient, tenantId: string, classroomId: string): Promise<number> {
    return tx.enrollment.count({
      where: {
        tenantId,
        classroomId,
        status: { in: [...OCCUPIED_STATUSES] },
        endDate: null,
        deletedAt: null,
      },
    });
  }

  /**
   * Throws CapacityExceededError when the classroom has no room left, or
   * EntityNotFoundError when the classroom doesn't exist. Count-then-compare
   * has a small TOCTOU race under concurrent requests targeting the same
   * classroom's last open seat - accepted, same trade-off as the inline
   * check this replaces (capacity overshoot by one is a minor,
   * self-correcting operational issue, unlike double-enrolling a child).
   */
  async assertCapacityAvailable(tx: Prisma.TransactionClient, tenantId: string, classroomId: string): Promise<void> {
    const classroom = await findOrThrow('Classroom', classroomId, () =>
      tx.classroom.findFirst({ where: { id: classroomId, tenantId, deletedAt: null } }),
    );

    const occupied = await this.countOccupiedSeats(tx, tenantId, classroomId);

    if (occupied >= classroom.capacity) {
      throw new CapacityExceededError(`Classroom ${classroomId} has reached capacity`);
    }
  }
}
