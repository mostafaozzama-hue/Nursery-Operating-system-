import { Global, Module } from '@nestjs/common';
import { CurrentTenantProvider } from './current-tenant.provider';
import { FixedTenantProvider } from './fixed-tenant.provider';

@Global()
@Module({
  providers: [{ provide: CurrentTenantProvider, useClass: FixedTenantProvider }],
  exports: [CurrentTenantProvider],
})
export class TenancyModule {}
