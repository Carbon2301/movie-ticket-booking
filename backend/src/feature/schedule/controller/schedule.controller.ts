import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
  Put,
  Delete,
  Query,
} from '@nestjs/common'
import { ScheduleService } from 'src/feature/schedule/service/schedule.service'
import { CreateScheduleDTO, UpdateScheduleDTO, ScheduleQueryDTO } from '../dto/index'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  // TODO: Add admin role guard when implemented
  async create(@Body(ValidationPipe) createScheduleDto: CreateScheduleDTO) {
    return this.scheduleService.create(createScheduleDto)
  }

  @Get('movie/:movieId')
  async getSchedulesByMovieId(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Query(ValidationPipe) query: ScheduleQueryDTO,
  ) {
    return this.scheduleService.findByMovieId(movieId, query.date)
  }

  @Get(':id')
  async getScheduleById(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findById(id)
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  // TODO: Add admin role guard when implemented
  async update(@Param('id', ParseIntPipe) id: number, @Body(ValidationPipe) updateScheduleDto: UpdateScheduleDTO) {
    return this.scheduleService.update(id, updateScheduleDto)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  // TODO: Add admin role guard when implemented
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.delete(id)
  }
}
