import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/services/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class CinemaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CinemaCreateInput) {
    return this.prisma.cinema.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    })
  }

  async findMany(params?: {
    skip?: number
    take?: number
    where?: Prisma.CinemaWhereInput
    orderBy?: Prisma.CinemaOrderByWithRelationInput
  }) {
    const { skip, take, where, orderBy } = params || {}
    return this.prisma.cinema.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        rooms: true,
      },
    })
  }

  async findUnique(where: Prisma.CinemaWhereUniqueInput) {
    return this.prisma.cinema.findUnique({
      where,
      include: {
        rooms: {
          include: {
            schedules: {
              include: {
                movie: true,
              },
            },
          },
        },
      },
    })
  }

  async update(params: { where: Prisma.CinemaWhereUniqueInput; data: Prisma.CinemaUpdateInput }) {
    const { where, data } = params
    return this.prisma.cinema.update({
      where,
      data,
      include: {
        rooms: true,
      },
    })
  }

  async delete(where: Prisma.CinemaWhereUniqueInput) {
    return this.prisma.$transaction(async (tx) => {
      // Delete all schedules in all rooms
      const rooms = await tx.room.findMany({
        where: { cinemaId: where.id },
      })

      for (const room of rooms) {
        await tx.schedule.deleteMany({
          where: { roomId: room.id },
        })
      }

      // Delete all rooms
      await tx.room.deleteMany({
        where: { cinemaId: where.id },
      })

      // Finally delete the cinema
      return tx.cinema.delete({
        where,
      })
    })
  }

  async count(where?: Prisma.CinemaWhereInput) {
    return this.prisma.cinema.count({
      where,
    })
  }

  async findCinemasWithAvailableRooms(minRooms: number = 1) {
    return this.prisma.cinema.findMany({
      where: {
        rooms: {
          some: {
            totalSeats: {
              gt: 0,
            },
          },
        },
      },
      include: {
        rooms: {
          where: {
            totalSeats: {
              gt: 0,
            },
          },
        },
      },
    })
  }

  async findCinemasByLocation(location: string) {
    return this.prisma.cinema.findMany({
      where: {
        location: {
          contains: location,
        },
      },
      include: {
        rooms: {
          include: {
            schedules: {
              include: {
                movie: true,
              },
            },
          },
        },
      },
    })
  }

  async findCinemasWithSchedules(startDate: Date, endDate: Date) {
    return this.prisma.cinema.findMany({
      where: {
        rooms: {
          some: {
            schedules: {
              some: {
                startTime: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        },
      },
      include: {
        rooms: {
          include: {
            schedules: {
              where: {
                startTime: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              include: {
                movie: true,
              },
            },
          },
        },
      },
    })
  }

  async getCinemaStatistics(cinemaId: number) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
      include: {
        rooms: {
          include: {
            schedules: {
              include: {
                tickets: true,
              },
            },
          },
        },
      },
    })

    if (!cinema) {
      return null
    }

    const totalRooms = cinema.rooms.length
    const totalSchedules = cinema.rooms.reduce((acc, room) => acc + room.schedules.length, 0)
    const totalTickets = cinema.rooms.reduce(
      (acc, room) => acc + room.schedules.reduce((scheduleAcc, schedule) => scheduleAcc + schedule.tickets.length, 0),
      0,
    )
    const totalSeats = cinema.rooms.reduce((acc, room) => acc + room.totalSeats, 0)

    return {
      cinemaId,
      totalRooms,
      totalSchedules,
      totalTickets,
      totalSeats,
      averageSeatsPerRoom: totalRooms > 0 ? totalSeats / totalRooms : 0,
    }
  }

  async bulkCreateCinemas(cinemasData: Prisma.CinemaCreateInput[]) {
    return this.prisma.$transaction(
      cinemasData.map((data) =>
        this.prisma.cinema.create({
          data: {
            ...data,
            createdAt: new Date(),
          },
        }),
      ),
    )
  }

  async bulkUpdateCinemas(updates: Array<{ where: Prisma.CinemaWhereUniqueInput; data: Prisma.CinemaUpdateInput }>) {
    return this.prisma.$transaction(
      updates.map(({ where, data }) =>
        this.prisma.cinema.update({
          where,
          data,
        }),
      ),
    )
  }

  async findCinemasWithFilters(filters: {
    name?: string
    location?: string
    minRooms?: number
    maxRooms?: number
    hasSchedules?: boolean
  }) {
    const where: Prisma.CinemaWhereInput = {}

    if (filters.name) {
      where.name = {
        contains: filters.name,
      }
    }

    if (filters.location) {
      where.location = {
        contains: filters.location,
      }
    }

    if (filters.minRooms !== undefined || filters.maxRooms !== undefined) {
      where.rooms = {}
      if (filters.minRooms !== undefined) {
        where.rooms = {
          ...where.rooms,
          ...(Array.isArray(where.rooms) ? {} : {}),
        }
      }
    }

    if (filters.hasSchedules !== undefined) {
      where.rooms = {
        ...where.rooms,
        some: {
          schedules: filters.hasSchedules
            ? {
                some: {},
              }
            : {
                none: {},
              },
        },
      }
    }

    return this.prisma.cinema.findMany({
      where,
      include: {
        rooms: {
          include: {
            schedules: {
              include: {
                movie: true,
              },
            },
          },
        },
      },
    })
  }

  async searchCinemasByText(searchText: string) {
    return this.prisma.cinema.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchText,
            },
          },
          {
            location: {
              contains: searchText,
            },
          },
        ],
      },
      include: {
        rooms: true,
      },
    })
  }

  async getCinemasWithMostRooms(limit: number = 10) {
    const cinemas = await this.prisma.cinema.findMany({
      include: {
        rooms: true,
      },
    })

    return cinemas
      .sort((a, b) => b.rooms.length - a.rooms.length)
      .slice(0, limit)
      .map((cinema) => ({
        ...cinema,
        roomCount: cinema.rooms.length,
      }))
  }

  async validateCinemaData(data: Prisma.CinemaCreateInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!data.name || (data.name as string).trim().length === 0) {
      errors.push('Cinema name is required')
    }

    if (!data.location || (data.location as string).trim().length === 0) {
      errors.push('Cinema location is required')
    }

    if (data.totalRooms !== undefined && (data.totalRooms as number) < 1) {
      errors.push('Total rooms must be at least 1')
    }

    if (data.totalRooms !== undefined && (data.totalRooms as number) > 100) {
      errors.push('Total rooms cannot exceed 100')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async findCinemasNearLocation(latitude: number, longitude: number, radiusKm: number = 10) {
    const allCinemas = await this.prisma.cinema.findMany({
      include: {
        rooms: true,
      },
    })

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLon = ((lon2 - lon1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }

    return allCinemas.filter((cinema) => {
      const cinemaLat = parseFloat((cinema.location as string).split(',')[0] || '0')
      const cinemaLon = parseFloat((cinema.location as string).split(',')[1] || '0')
      const distance = calculateDistance(latitude, longitude, cinemaLat, cinemaLon)
      return distance <= radiusKm
    })
  }

  async getCinemaCapacityInfo(cinemaId: number) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id: cinemaId },
      include: {
        rooms: {
          include: {
            schedules: {
              include: {
                tickets: true,
              },
            },
          },
        },
      },
    })

    if (!cinema) {
      return null
    }

    const capacityInfo = {
      cinemaId,
      totalCapacity: 0,
      usedCapacity: 0,
      availableCapacity: 0,
      rooms: [] as Array<{
        roomId: number
        roomName: string
        totalSeats: number
        bookedSeats: number
        availableSeats: number
      }>,
    }

    cinema.rooms.forEach((room) => {
      const bookedSeats = room.schedules.reduce(
        (acc, schedule) => acc + schedule.tickets.length,
        0,
      )
      const availableSeats = room.totalSeats - bookedSeats

      capacityInfo.totalCapacity += room.totalSeats
      capacityInfo.usedCapacity += bookedSeats
      capacityInfo.availableCapacity += availableSeats

      capacityInfo.rooms.push({
        roomId: room.id,
        roomName: room.name,
        totalSeats: room.totalSeats,
        bookedSeats,
        availableSeats,
      })
    })

    return capacityInfo
  }
}
