import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import { CinemaService } from '../service/cinema.service'
import { CreateCinemaDTO, UpdateCinemaDTO, CinemaQueryDTO } from '../dto'
import { AccessTokenGuard } from '../../../shared/guards/access-token.guard'

@Controller('cinemas')
export class CinemaController {
  constructor(private readonly cinemaService: CinemaService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  // @Roles('admin')
  async createCinema(@Body(ValidationPipe) createCinemaDto: CreateCinemaDTO) {
    return this.cinemaService.createCinema(createCinemaDto)
  }

  @Get()
  async getAllCinemas(@Query(ValidationPipe) queryDto: CinemaQueryDTO) {
    return this.cinemaService.getAllCinemas(queryDto)
  }

  @Get(':id')
  async getCinemaById(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.getCinemaById(id)
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  // @Roles('admin')
  async updateCinema(@Param('id', ParseIntPipe) id: number, @Body(ValidationPipe) updateCinemaDto: UpdateCinemaDTO) {
    return this.cinemaService.updateCinema(id, updateCinemaDto)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  // @Roles('admin')
  async deleteCinema(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.deleteCinema(id)
  }
}
