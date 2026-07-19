import { Module } from '@nestjs/common';
import { ClassroomController } from './classroom.controller';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomService } from './classroom.service';

@Module({
  controllers: [ClassroomController],
  providers: [ClassroomService, ClassroomRepository],
})
export class ClassroomModule {}
