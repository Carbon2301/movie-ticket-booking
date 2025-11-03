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

  async getCinemasWithAvailableRooms(minRooms: number = 1) {
    const cinemas = await this.cinemaRepository.findCinemasWithAvailableRooms(minRooms)
    return cinemas.map((cinema) => ({
      ...cinema,
      availableRoomsCount: cinema.rooms.length,
    }))
  }

  async searchCinemasByLocation(location: string) {
    if (!location || location.trim().length === 0) {
      throw new BadRequestException('Location search term is required')
    }
    return this.cinemaRepository.findCinemasByLocation(location)
  }

  async getCinemasWithSchedulesInDateRange(startDate: Date, endDate: Date) {
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date')
    }
    return this.cinemaRepository.findCinemasWithSchedules(startDate, endDate)
  }

  async getCinemaStatistics(cinemaId: number) {
    await this.getCinemaById(cinemaId)
    const statistics = await this.cinemaRepository.getCinemaStatistics(cinemaId)
    if (!statistics) {
      throw new NotFoundException('Cinema statistics not found')
    }
    return statistics
  }

  async bulkCreateCinemas(cinemasData: CreateCinemaDTO[]) {
    if (!cinemasData || cinemasData.length === 0) {
      throw new BadRequestException('Cinemas data is required')
    }

    const validationResults = await Promise.all(
      cinemasData.map((data) => this.cinemaRepository.validateCinemaData(data)),
    )

    const invalidCinemas = validationResults.filter((result) => !result.valid)
    if (invalidCinemas.length > 0) {
      const allErrors = invalidCinemas.flatMap((result) => result.errors)
      throw new BadRequestException(`Validation failed: ${allErrors.join(', ')}`)
    }

    const existingCinemas = await Promise.all(
      cinemasData.map((data) =>
        this.cinemaRepository.findUnique({
          name_location: { name: data.name, location: data.location },
        }),
      ),
    )

    const duplicates = existingCinemas.filter((cinema) => cinema !== null)
    if (duplicates.length > 0) {
      throw new BadRequestException('Some cinemas already exist')
    }

    const prismaData = cinemasData.map((data) => ({
      name: data.name,
      location: data.location,
      totalRooms: data.totalRooms,
      createdAt: new Date(),
    }))

    return this.cinemaRepository.bulkCreateCinemas(prismaData)
  }

  async bulkUpdateCinemas(
    updates: Array<{ id: number; data: UpdateCinemaDTO }>,
  ) {
    if (!updates || updates.length === 0) {
      throw new BadRequestException('Updates data is required')
    }

    const existingCinemas = await Promise.all(
      updates.map((update) => this.getCinemaById(update.id)),
    )

    const prismaUpdates = updates.map((update) => ({
      where: { id: update.id },
      data: update.data,
    }))

    return this.cinemaRepository.bulkUpdateCinemas(prismaUpdates)
  }

  async searchCinemas(filters: {
    name?: string
    location?: string
    minRooms?: number
    maxRooms?: number
    hasSchedules?: boolean
  }) {
    return this.cinemaRepository.findCinemasWithFilters(filters)
  }

  async searchCinemasByText(searchText: string) {
    if (!searchText || searchText.trim().length === 0) {
      throw new BadRequestException('Search text is required')
    }
    return this.cinemaRepository.searchCinemasByText(searchText)
  }

  async getTopCinemasByRoomCount(limit: number = 10) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }
    return this.cinemaRepository.getCinemasWithMostRooms(limit)
  }

  async getCinemasNearLocation(latitude: number, longitude: number, radiusKm: number = 10) {
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Invalid latitude')
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Invalid longitude')
    }
    if (radiusKm < 0 || radiusKm > 1000) {
      throw new BadRequestException('Radius must be between 0 and 1000 km')
    }
    return this.cinemaRepository.findCinemasNearLocation(latitude, longitude, radiusKm)
  }

  async getCinemaCapacityInfo(cinemaId: number) {
    await this.getCinemaById(cinemaId)
    const capacityInfo = await this.cinemaRepository.getCinemaCapacityInfo(cinemaId)
    if (!capacityInfo) {
      throw new NotFoundException('Cinema capacity information not found')
    }
    return capacityInfo
  }

  async validateCinemaBeforeCreation(createCinemaDto: CreateCinemaDTO) {
    const validation = await this.cinemaRepository.validateCinemaData(createCinemaDto)
    if (!validation.valid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const existingCinema = await this.cinemaRepository.findUnique({
      name_location: { name: createCinemaDto.name, location: createCinemaDto.location },
    })

    if (existingCinema) {
      throw new BadRequestException('Cinema with this name and location already exists')
    }

    return { valid: true }
  }

  async getCinemaWithDetailedInfo(id: number) {
    const cinema = await this.getCinemaById(id)
    const statistics = await this.getCinemaStatistics(id)
    const capacityInfo = await this.getCinemaCapacityInfo(id)

    return {
      ...cinema,
      statistics,
      capacityInfo,
    }
  }

  async updateCinemaWithValidation(id: number, updateCinemaDto: UpdateCinemaDTO) {
    await this.getCinemaById(id)

    if (updateCinemaDto.name || updateCinemaDto.location) {
      const currentCinema = await this.cinemaRepository.findUnique({ id })
      const checkName = updateCinemaDto.name || currentCinema?.name
      const checkLocation = updateCinemaDto.location || currentCinema?.location

      if (checkName && checkLocation) {
        const existingCinema = await this.cinemaRepository.findUnique({
          name_location: { name: checkName as string, location: checkLocation as string },
        })

        if (existingCinema && existingCinema.id !== id) {
          throw new BadRequestException('Another cinema with this name and location already exists')
        }
      }
    }

    return this.updateCinema(id, updateCinemaDto)
  }

  async deleteCinemaWithConfirmation(id: number, confirmationCode: string) {
    if (confirmationCode !== `DELETE_${id}`) {
      throw new BadRequestException('Invalid confirmation code')
    }
    return this.deleteCinema(id)
  }

  async getCinemaRevenueReport(cinemaId: number, startDate: Date, endDate: Date) {
    const cinema = await this.getCinemaById(cinemaId)

    const cinemasWithSchedules = await this.cinemaRepository.findCinemasWithSchedules(startDate, endDate)
    const targetCinema = cinemasWithSchedules.find((c) => c.id === cinemaId)

    if (!targetCinema) {
      return {
        cinemaId,
        cinemaName: cinema.name,
        totalRevenue: 0,
        totalTickets: 0,
        totalSchedules: 0,
        averageRevenuePerSchedule: 0,
        period: {
          startDate,
          endDate,
        },
      }
    }

    let totalRevenue = 0
    let totalTickets = 0

    targetCinema.rooms.forEach((room) => {
      room.schedules.forEach((schedule) => {
        const scheduleTickets = (schedule as any).tickets || []
        totalTickets += scheduleTickets.length
        scheduleTickets.forEach((ticket: any) => {
          totalRevenue += ticket.price || 0
        })
      })
    })

    const totalSchedules = targetCinema.rooms.reduce(
      (acc, room) => acc + room.schedules.length,
      0,
    )

    return {
      cinemaId,
      cinemaName: cinema.name,
      totalRevenue,
      totalTickets,
      totalSchedules,
      averageRevenuePerSchedule: totalSchedules > 0 ? totalRevenue / totalSchedules : 0,
      period: {
        startDate,
        endDate,
      },
    }
  }
}
