import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CapacityExceededError } from '../../../common/errors/capacity-exceeded.error';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { InactiveMembershipError } from '../../../common/errors/inactive-membership.error';
import { ChildGuardianConflictError } from '../child-guardian/child-guardian-conflict.error';
import { EnrollmentConflictError } from '../enrollment/enrollment-conflict.error';
import { GuardianConflictError } from '../guardian/guardian-conflict.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { AdmissionRepository } from './admission.repository';
import { AdmissionService } from './admission.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';

describe('AdmissionService', () => {
  let repository: jest.Mocked<AdmissionRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let service: AdmissionService;

  const baseDto = (): CreateAdmissionDto => ({
    child: { firstName: 'Ava', lastName: 'Smith', dateOfBirth: '2022-03-15' },
    guardians: [
      { guardianId: 'guardian-1', relationshipType: 'MOTHER', isPrimaryContact: true },
    ],
    classroomId: 'room-1',
  });

  beforeEach(() => {
    repository = { create: jest.fn() } as unknown as jest.Mocked<AdmissionRepository>;
    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('user-1') } as unknown as jest.Mocked<CurrentUserProvider>;

    service = new AdmissionService(repository, currentTenant, currentUser);
  });

  describe('create', () => {
    it('passes the resolved tenant and user to the repository for an existing guardian', async () => {
      const dto = baseDto();
      repository.create.mockResolvedValue({ child: { id: 'child-1' } } as never);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
      expect(result).toEqual({ child: { id: 'child-1' } });
    });

    it('accepts a new-guardian entry with a phone number', async () => {
      const dto: CreateAdmissionDto = {
        ...baseDto(),
        guardians: [
          {
            firstName: 'Sarah',
            lastName: 'Ahmed',
            phone: '+201000000000',
            relationshipType: 'MOTHER',
            isPrimaryContact: true,
          },
        ],
      };
      repository.create.mockResolvedValue({ child: { id: 'child-1' } } as never);

      await expect(service.create(dto)).resolves.toBeDefined();
      expect(repository.create).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
    });

    it('rejects a guardian entry that supplies neither guardianId nor a new guardian name', async () => {
      const dto: CreateAdmissionDto = {
        ...baseDto(),
        guardians: [{ relationshipType: 'MOTHER' }],
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a guardian entry that supplies both guardianId and a new guardian name', async () => {
      const dto: CreateAdmissionDto = {
        ...baseDto(),
        guardians: [
          { guardianId: 'guardian-1', firstName: 'Sarah', lastName: 'Ahmed', relationshipType: 'MOTHER' },
        ],
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a new guardian with neither phone nor email', async () => {
      const dto: CreateAdmissionDto = {
        ...baseDto(),
        guardians: [{ firstName: 'Sarah', lastName: 'Ahmed', relationshipType: 'MOTHER' }],
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('translates InactiveMembershipError into a 400', async () => {
      repository.create.mockRejectedValue(new InactiveMembershipError('User is not an active member'));
      await expect(service.create(baseDto())).rejects.toThrow(BadRequestException);
    });

    it('translates GuardianConflictError into a 409', async () => {
      repository.create.mockRejectedValue(new GuardianConflictError('This user is already linked to another guardian profile in this tenant'));
      await expect(service.create(baseDto())).rejects.toThrow(ConflictException);
    });

    it('translates ChildGuardianConflictError into a 409', async () => {
      repository.create.mockRejectedValue(new ChildGuardianConflictError('Child already has a primary contact'));
      await expect(service.create(baseDto())).rejects.toThrow(ConflictException);
    });

    it('translates a capacity conflict into a 409', async () => {
      repository.create.mockRejectedValue(new CapacityExceededError('Classroom room-1 has reached capacity'));
      await expect(service.create(baseDto())).rejects.toThrow(ConflictException);
    });

    it('translates an enrollment conflict into a 409', async () => {
      repository.create.mockRejectedValue(new EnrollmentConflictError('Child already has an active enrollment'));
      await expect(service.create(baseDto())).rejects.toThrow(ConflictException);
    });

    it('translates a not-found existing guardianId into a 404', async () => {
      repository.create.mockRejectedValue(new EntityNotFoundError('Guardian', 'guardian-1'));
      await expect(service.create(baseDto())).rejects.toThrow(NotFoundException);
    });
  });
});
