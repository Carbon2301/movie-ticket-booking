import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { MovieRepository } from '../repo/movie.repo'
import { CreateMovieDTO, UpdateMovieDTO, MovieQueryDTO } from '../dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class MovieService {
  constructor(private readonly movieRepository: MovieRepository) {}

  async createMovie(createMovieDto: CreateMovieDTO) {
    const { categoryIds, ...movieData } = createMovieDto

    const existingMovie = await this.movieRepository.findUnique({ title: movieData.title })
    if (existingMovie) {
      throw new BadRequestException('Movie with this title already exists')
    }

    const movie = await this.movieRepository.create({
      ...movieData,
      releaseDate: new Date(createMovieDto.releaseDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Add categories if provided
    if (categoryIds && categoryIds.length > 0) {
      const existingCategories = await this.movieRepository.findCategories()
      const existingCategoryIds = existingCategories.map((cat) => cat.id)

      const invalidCategories = categoryIds.filter((id) => !existingCategoryIds.includes(id))
      if (invalidCategories.length > 0) {
        throw new BadRequestException(`Categories with IDs ${invalidCategories.join(', ')} do not exist`)
      }

      await this.movieRepository.updateMovieCategories(movie.id, categoryIds)
      return this.movieRepository.findUnique({ id: movie.id })
    }

    return movie
  }

  async getAllMovies(queryDto: MovieQueryDTO) {
    const { page = 1, limit = 10, name, genre, category } = queryDto
    const skip = (page - 1) * limit

    const where: Prisma.MovieWhereInput = {}

    if (name) {
      where.title = {
        contains: name,
      }
    }

    if (genre) {
      where.genre = {
        contains: genre,
      }
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            name: {
              contains: category,
            },
          },
        },
      }
    }

    const [movies, total] = await Promise.all([
      this.movieRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.movieRepository.count(where),
    ])

    return {
      movies: (movies as any[]).map((m: any) => ({
        ...m,
        favoritesCount: m?._count?.favorites ?? 0,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getMovieById(id: number) {
    const movie = await this.movieRepository.findUnique({ id })
    if (!movie) {
      throw new NotFoundException('Movie not found')
    }
    return movie
  }

  async updateMovie(id: number, updateMovieDto: UpdateMovieDTO) {
    await this.getMovieById(id)

    const { categoryIds, ...movieData } = updateMovieDto

    const updateData: Prisma.MovieUpdateInput = {
      ...movieData,
      updatedAt: new Date(),
    }

    if (updateMovieDto.releaseDate) {
      updateData.releaseDate = new Date(updateMovieDto.releaseDate)
    }

    const movie = await this.movieRepository.update({
      where: { id },
      data: updateData,
    })

    if (categoryIds !== undefined) {
      // Validate if all categories exist
      const existingCategories = await this.movieRepository.findCategories()
      const existingCategoryIds = existingCategories.map((cat) => cat.id)

      const invalidCategories = categoryIds.filter((id) => !existingCategoryIds.includes(id))
      if (invalidCategories.length > 0) {
        throw new BadRequestException(`Categories with IDs ${invalidCategories.join(', ')} do not exist`)
      }

      await this.movieRepository.updateMovieCategories(id, categoryIds)
      return this.movieRepository.findUnique({ id })
    }

    return movie
  }

  async getMovieFavoriteCount(id: number) {
    return this.movieRepository.countFavorites(id)
  }

  async getMovieScheduleCount(id: number) {
    return this.movieRepository.countSchedules(id)
  }

  async deleteMovie(id: number) {
    const movie = await this.getMovieById(id)

    const scheduleWithTickets = await this.movieRepository.findScheduleWithTickets(id)
    if (scheduleWithTickets) {
      throw new BadRequestException('Cannot delete movie that has schedules with booked tickets')
    }

    try {
      await this.movieRepository.delete({ id })
      return {
        message: `Movie "${movie.title}" has been successfully deleted`,
        deletedCinemaId: id,
      }
    } catch (error) {
      throw new BadRequestException('Failed to delete movie. Please try again later.')
    }
  }

  async getCategories() {
    return this.movieRepository.findCategories()
  }

  async addFavorite(id: number, userId: number) {
    const movie = await this.getMovieById(id)
    if (!movie) {
      throw new NotFoundException('Movie not found')
    }

    const favorite = await this.movieRepository.addFavorite(id, userId)
    if (!favorite) {
      throw new BadRequestException('Movie already favorited')
    }

    return {
      message: 'Movie favorited successfully',
      favorited: true,
    }
  }

  async removeFavorite(id: number, userId: number) {
    const movie = await this.getMovieById(id)
    if (!movie) {
      throw new NotFoundException('Movie not found')
    }

    const favorite = await this.movieRepository.removeFavorite(id, userId)
    if (!favorite) {
      throw new BadRequestException('Movie not favorited')
    }

    return {
      message: 'Movie unfavorited successfully',
      favorited: false,
    }
  }

  async toggleFavorite(id: number, userId: number) {
    const movie = await this.getMovieById(id)
    if (!movie) {
      throw new NotFoundException('Movie not found')
    }

    const existingFavorite = await this.movieRepository.findFavorite(id, userId)

    if (existingFavorite) {
      await this.movieRepository.removeFavorite(id, userId)
      return {
        message: 'Movie unfavorited successfully',
        favorited: false,
      }
    } else {
      await this.movieRepository.addFavorite(id, userId)
      return {
        message: 'Movie favorited successfully',
        favorited: true,
      }
    }
  }

  async checkFavoriteStatus(id: number, userId: number) {
    const favorite = await this.movieRepository.findFavorite(id, userId)
    return {
      favorited: !!favorite,
    }
  }

  async getTopFavoriteMovies() {
    return this.movieRepository.getTopFavoriteMovies(5)
  }

  // movie.service.ts
  async getFavoriteMovies(userId: number) {
    // Lấy danh sách movieId mà user này đã favorite
    const favoriteLinks = await this.movieRepository.findFavoritesByUser(userId)
    if (!favoriteLinks.length) return []

    // Giả sử favoriteLinks là array object có movieId: [{ movieId: 3 }, { movieId: 7 }]
    const movieIds = favoriteLinks.map((f) => f.movieId)

    // Lấy thông tin chi tiết các phim
    // Có thể thêm relations nếu muốn (categories, ...)
    const movies = await this.movieRepository.findMany({
      where: { id: { in: movieIds } },
      orderBy: { createdAt: 'desc' },
    })

    // (optional) Nếu muốn trả kèm số lượng favorite cho mỗi phim
    // (movies as any[]).forEach(m => m.favoritesCount = m._count?.favorites ?? 0);

    return movies
  }
}
