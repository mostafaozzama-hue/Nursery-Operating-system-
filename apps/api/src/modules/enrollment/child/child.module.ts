import { Module } from '@nestjs/common';
import { ChildController } from './child.controller';
import { ChildRepository } from './child.repository';
import { ChildService } from './child.service';

@Module({
  controllers: [ChildController],
  providers: [ChildService, ChildRepository],
})
export class ChildModule {}
