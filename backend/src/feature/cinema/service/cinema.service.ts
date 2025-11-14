import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CinemaRepository } from '../repo/cinema.repo'
import { CreateCinemaDTO, UpdateCinemaDTO, CinemaQueryDTO } from '../dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class CinemaService {
  constructor(private readonly cinemaRepository: CinemaRepository) {}

  async createCinema(createCinemaDto: CreateCinemaDTO) {
    const existingCinema = await this.cinemaRepository.findUnique({
      name_location: { name: createCinemaDto.name, location: createCinemaDto.location },
    })
    if (existingCinema) {
      throw new BadRequestException('Cinema with this name already exists')
    }

    const cinema = await this.cinemaRepository.create({
      ...createCinemaDto,
      createdAt: new Date(),
    })
    return cinema
  }

  async getAllCinemas(queryDto: CinemaQueryDTO) {
    const { page = 1, limit = 10, name, location } = queryDto
    const skip = (page - 1) * limit

    const where: Prisma.CinemaWhereInput = {}

    if (name) {
      where.name = {
        contains: name,
      }
    }

    if (location) {
      where.location = {
        contains: location,
      }
    }

    const [cinemas, total] = await Promise.all([
      this.cinemaRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.cinemaRepository.count(where),
    ])

    return {
      cinemas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getCinemaById(id: number) {
    const cinema = await this.cinemaRepository.findUnique({ id })
    if (!cinema) {
      throw new NotFoundException('Cinema not found')
    }
    return cinema
  }

  async updateCinema(id: number, updateCinemaDto: UpdateCinemaDTO) {
    await this.getCinemaById(id)

    const cinema = await this.cinemaRepository.update({
      where: { id },
      data: updateCinemaDto,
    })

    return cinema
  }

  async deleteCinema(id: number) {
    const cinema = await this.getCinemaById(id)

    try {
      await this.cinemaRepository.delete({ id })
      return {
        message: `Cinema "${cinema.name}" has been successfully deleted`,
        deletedCinemaId: id,
      }
    } catch (error) {
      throw new BadRequestException('Failed to delete cinema. Please try again later.')
    }
  }
}
