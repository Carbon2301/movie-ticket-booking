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
import { MovieService } from '../service/movie.service'
import { CreateMovieDTO, UpdateMovieDTO, MovieQueryDTO } from '../dto'
import { AccessTokenGuard } from '../../../shared/guards/access-token.guard'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async createMovie(@Body(ValidationPipe) createMovieDto: CreateMovieDTO) {
    return this.movieService.createMovie(createMovieDto)
  }

  @Get()
  async getAllMovies(@Query(ValidationPipe) queryDto: MovieQueryDTO) {
    return this.movieService.getAllMovies(queryDto)
  }

  @Get('categories')
  async getCategories() {
    return this.movieService.getCategories()
  }

  @Get('top-favorites')
  async getTopFavoriteMovies() {
    return this.movieService.getTopFavoriteMovies()
  }

  @Get('favorites')
  @UseGuards(AccessTokenGuard)
  async getFavoriteMovies(@ActiveUser('userId') userId: number) {
    return this.movieService.getFavoriteMovies(userId)
  }

  @Get(':id')
  async getMovieById(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.getMovieById(id)
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  async updateMovie(@Param('id', ParseIntPipe) id: number, @Body(ValidationPipe) updateMovieDto: UpdateMovieDTO) {
    return this.movieService.updateMovie(id, updateMovieDto)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  async deleteMovie(@Param('id', ParseIntPipe) id: number, @Body('confirm') confirm: boolean) {
    const movie = await this.movieService.getMovieById(id)

    if (!confirm) {
      return {
        message: 'Please confirm deletion',
        movie: {
          id: movie.id,
          title: movie.title,
          relatedData: {
            categories: movie.categories.length,
            comments: movie.comments.length,
            favorites: await this.movieService.getMovieFavoriteCount(id),
            schedules: await this.movieService.getMovieScheduleCount(id),
          },
        },
      }
    }

    return await this.movieService.deleteMovie(id)
  }

  @Put(':id/favorite')
  @UseGuards(AccessTokenGuard)
  async toggleFavorite(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.movieService.toggleFavorite(id, userId)
  }

  @Get(':id/favorite/status')
  @UseGuards(AccessTokenGuard)
  async checkFavoriteStatus(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.movieService.checkFavoriteStatus(id, userId)
  }
}
