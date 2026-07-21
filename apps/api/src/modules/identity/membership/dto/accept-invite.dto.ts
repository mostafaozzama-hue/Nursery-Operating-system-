import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

/**
 * tenantId is not a secret (comparable to a workspace id already visible in
 * every JWT and URL in this app) - it's included so accept-invite can
 * establish a normal withTenantContext RLS scope before querying, the same
 * way every other tenant-scoped write does. The actual secret is token;
 * supplying the right tenantId with the wrong token still matches no row.
 */
export class AcceptInviteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}
