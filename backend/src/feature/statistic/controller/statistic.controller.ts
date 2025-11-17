import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { StatisticService } from 'src/feature/statistic/service/statistic.service'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'

@Controller('statistics')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get('revenue')
  @UseGuards(AccessTokenGuard)
  async getRevenueStatistics(
    @Query('period') period?: 'day' | 'week' | 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticService.getRevenueStatistics(period, startDate, endDate)
  }

  @Get('bookings')
  @UseGuards(AccessTokenGuard)
  async getBookingStatistics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.statisticService.getBookingStatistics(startDate, endDate)
  }
}
