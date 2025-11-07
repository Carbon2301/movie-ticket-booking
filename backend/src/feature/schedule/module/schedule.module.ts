import { Module } from '@nestjs/common'
import { ScheduleController } from '../controller/schedule.controller'
import { ScheduleService } from '../service/schedule.service'
import { ScheduleRepository } from '../repo/schedule.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  providers: [ScheduleService, ScheduleRepository],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
