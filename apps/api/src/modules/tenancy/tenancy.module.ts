import { Global, Module } from '@nestjs/common';
import { CurrentTenantProvider } from './current-tenant.provider';
import { JwtTenantProvider } from './jwt-tenant.provider';

@Global()
@Module({
  providers: [{ provide: CurrentTenantProvider, useClass: JwtTenantProvider }],
  exports: [CurrentTenantProvider],
})
export class TenancyModule {}
