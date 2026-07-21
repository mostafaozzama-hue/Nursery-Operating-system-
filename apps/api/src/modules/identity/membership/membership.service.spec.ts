import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { CurrentUserProvider } from '../current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { TokenService } from '../token.service';
import { MembershipConflictError } from './membership-conflict.error';
import { MembershipRepository } from './membership.repository';
import { MembershipService } from './membership.service';

jest.mock('argon2');

const membership = {
  id: 'membership-1',
  status: 'INVITED',
  role: { id: 'role-2', key: 'ADMIN', name: 'Admin' },
  invitedAt: new Date(),
  activatedAt: null,
  revokedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const user = { id: 'user-1', email: 'new-admin@barney.test' };

describe('MembershipService', () => {
  let repository: jest.Mocked<MembershipRepository>;
  let currentTenant: jest.Mocked<CurrentTenantProvider>;
  let currentUser: jest.Mocked<CurrentUserProvider>;
  let tokenService: jest.Mocked<TokenService>;
  let service: MembershipService;

  beforeEach(() => {
    repository = {
      invite: jest.fn(),
      acceptInvite: jest.fn(),
    } as unknown as jest.Mocked<MembershipRepository>;

    currentTenant = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as unknown as jest.Mocked<CurrentTenantProvider>;
    currentUser = { getUserId: jest.fn().mockReturnValue('inviter-1') } as unknown as jest.Mocked<CurrentUserProvider>;
    tokenService = {
      hashToken: jest.fn().mockReturnValue('hashed-token'),
    } as unknown as jest.Mocked<TokenService>;

    service = new MembershipService(repository, currentTenant, currentUser, tokenService);
    (argon2.hash as jest.Mock).mockReset().mockResolvedValue('hashed');
  });

  describe('invite', () => {
    it('passes the resolved tenant and inviter to the repository, returning the raw token once', async () => {
      repository.invite.mockResolvedValue({ membership, user } as never);

      const result = await service.invite({ email: 'new-admin@barney.test', roleKey: 'ADMIN' }, 'OWNER');

      expect(repository.invite).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ email: 'new-admin@barney.test', roleKey: 'ADMIN' }),
        'inviter-1',
      );
      expect(result.roleKey).toBe('ADMIN');
      expect(result.email).toBe('new-admin@barney.test');
      expect(result.inviteToken).toEqual(expect.any(String));
    });

    it('forbids a non-OWNER caller from inviting an OWNER', async () => {
      await expect(service.invite({ email: 'x@x.com', roleKey: 'OWNER' }, 'ADMIN')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.invite).not.toHaveBeenCalled();
    });

    it('allows an OWNER caller to invite another OWNER', async () => {
      repository.invite.mockResolvedValue({
        membership: { ...membership, role: { id: 'role-1', key: 'OWNER', name: 'Owner' } },
        user,
      } as never);

      const result = await service.invite({ email: 'x@x.com', roleKey: 'OWNER' }, 'OWNER');
      expect(result.roleKey).toBe('OWNER');
    });

    it('translates an already-active-member conflict into a 409', async () => {
      repository.invite.mockRejectedValue(new MembershipConflictError('already an active member'));
      await expect(
        service.invite({ email: 'x@x.com', roleKey: 'ADMIN' }, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('translates a not-found system role into a 404', async () => {
      repository.invite.mockRejectedValue(new EntityNotFoundError('Role', 'ADMIN'));
      await expect(
        service.invite({ email: 'x@x.com', roleKey: 'ADMIN' }, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvite', () => {
    it('hashes the token and password, delegating to the repository', async () => {
      repository.acceptInvite.mockResolvedValue({ membershipId: 'membership-1', userId: 'user-1' } as never);

      await service.acceptInvite({ tenantId: 'tenant-1', token: 'raw-token', password: 'CorrectHorseBattery1' });

      expect(tokenService.hashToken).toHaveBeenCalledWith('raw-token');
      expect(argon2.hash).toHaveBeenCalledWith('CorrectHorseBattery1');
      expect(repository.acceptInvite).toHaveBeenCalledWith('tenant-1', 'hashed-token', 'hashed');
    });

    it('translates an invalid/expired/already-used invite into a 409', async () => {
      repository.acceptInvite.mockRejectedValue(new MembershipConflictError('This invite has expired'));
      await expect(
        service.acceptInvite({ tenantId: 'tenant-1', token: 'raw-token', password: 'CorrectHorseBattery1' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
