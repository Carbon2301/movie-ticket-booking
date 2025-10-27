import { Module } from '@nestjs/common'
import { MovieService } from '../service/movie.service'
import { MovieController } from '../controller/movie.controller'
import { MovieRepository } from '../repo/movie.repo'
import { SharedModule } from '../../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [MovieController],
  providers: [MovieService, MovieRepository],
  exports: [MovieService, MovieRepository],
})
export class MovieModule {}
