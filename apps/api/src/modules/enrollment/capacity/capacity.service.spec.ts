import { CapacityExceededError } from '../../../common/errors/capacity-exceeded.error';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CapacityService } from './capacity.service';

describe('CapacityService', () => {
  let service: CapacityService;
  let tx: { enrollment: { count: jest.Mock }; classroom: { findFirst: jest.Mock } };

  beforeEach(() => {
    tx = {
      enrollment: { count: jest.fn() },
      classroom: { findFirst: jest.fn() },
    };
    service = new CapacityService();
  });

  describe('countOccupiedSeats', () => {
    it('counts ACTIVE and SUSPENDED enrollments in the classroom', async () => {
      tx.enrollment.count.mockResolvedValue(3);

      const result = await service.countOccupiedSeats(tx as never, 'tenant-1', 'room-1');

      expect(result).toBe(3);
      expect(tx.enrollment.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          classroomId: 'room-1',
          status: { in: ['ACTIVE', 'SUSPENDED'] },
          endDate: null,
          deletedAt: null,
        },
      });
    });
  });

  describe('assertCapacityAvailable', () => {
    it('does not throw when the classroom has room', async () => {
      tx.classroom.findFirst.mockResolvedValue({ id: 'room-1', capacity: 10 });
      tx.enrollment.count.mockResolvedValue(9);

      await expect(service.assertCapacityAvailable(tx as never, 'tenant-1', 'room-1')).resolves.toBeUndefined();
    });

    it('throws CapacityExceededError when the classroom is already at capacity', async () => {
      tx.classroom.findFirst.mockResolvedValue({ id: 'room-1', capacity: 10 });
      tx.enrollment.count.mockResolvedValue(10);

      await expect(service.assertCapacityAvailable(tx as never, 'tenant-1', 'room-1')).rejects.toThrow(
        CapacityExceededError,
      );
    });

    it('throws EntityNotFoundError when the classroom does not exist, without counting', async () => {
      tx.classroom.findFirst.mockResolvedValue(null);

      await expect(service.assertCapacityAvailable(tx as never, 'tenant-1', 'room-x')).rejects.toThrow(
        EntityNotFoundError,
      );
      expect(tx.enrollment.count).not.toHaveBeenCalled();
    });
  });
});
