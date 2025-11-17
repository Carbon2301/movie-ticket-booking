import { Module } from '@nestjs/common'
import { StatisticService } from '../service/statistic.service'
import { StatisticController } from '../controller/statistic.controller'
import { StatisticRepo } from '../repo/statistic.repo'
import { SharedModule } from '../../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [StatisticController],
  providers: [StatisticService, StatisticRepo],
  exports: [StatisticService, StatisticRepo],
})
export class StatisticModule {}
