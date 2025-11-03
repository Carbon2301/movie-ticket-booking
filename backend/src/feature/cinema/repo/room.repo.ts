import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/services/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RoomCreateInput) {
    return this.prisma.room.create({
      data,
      include: {
        cinema: true,
      },
    })
  }

  async findUnique(where: Prisma.RoomWhereUniqueInput) {
    return this.prisma.room.findUnique({
      where,
      include: {
        cinema: true,
        schedules: {
          include: {
            movie: true,
          },
        },
      },
    })
  }

  async update(params: { where: Prisma.RoomWhereUniqueInput; data: Prisma.RoomUpdateInput }) {
    const { where, data } = params
    return this.prisma.room.update({
      where,
      data,
      include: {
        cinema: true,
      },
    })
  }

  async delete(where: Prisma.RoomWhereUniqueInput) {
    return this.prisma.room.delete({
      where,
    })
  }

  async countSchedules(roomId: number) {
    return this.prisma.schedule.count({
      where: { roomId },
    })
  }

  async countRoomsByCinema(cinemaId: number) {
    return this.prisma.room.count({
      where: { cinemaId },
    })
  }

  async findMany(params?: {
    skip?: number
    take?: number
    where?: Prisma.RoomWhereInput
    orderBy?: Prisma.RoomOrderByWithRelationInput
  }) {
    const { skip, take, where, orderBy } = params || {}
    return this.prisma.room.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        cinema: true,
        schedules: {
          include: {
            movie: true,
            tickets: true,
          },
        },
      },
    })
  }

  async findRoomsByCinema(cinemaId: number) {
    return this.prisma.room.findMany({
      where: { cinemaId },
      include: {
        cinema: true,
        schedules: {
          include: {
            movie: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
  }

  async findAvailableRooms(cinemaId?: number) {
    const where: Prisma.RoomWhereInput = {
      totalSeats: {
        gt: 0,
      },
    }

    if (cinemaId) {
      where.cinemaId = cinemaId
    }

    return this.prisma.room.findMany({
      where,
      include: {
        cinema: true,
        schedules: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          include: {
            movie: true,
          },
        },
      },
    })
  }

  async findRoomsWithSchedules(startDate: Date, endDate: Date) {
    return this.prisma.room.findMany({
      where: {
        schedules: {
          some: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      include: {
        cinema: true,
        schedules: {
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            movie: true,
            tickets: true,
          },
        },
      },
    })
  }

  async getRoomOccupancyRate(roomId: number, startDate: Date, endDate: Date) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        schedules: {
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            tickets: true,
          },
        },
      },
    })

    if (!room) {
      return null
    }

    const totalSeats = room.totalSeats
    const totalSchedules = room.schedules.length
    const totalTickets = room.schedules.reduce((acc, schedule) => acc + schedule.tickets.length, 0)
    const totalPossibleTickets = totalSeats * totalSchedules
    const occupancyRate = totalPossibleTickets > 0 ? (totalTickets / totalPossibleTickets) * 100 : 0

    return {
      roomId,
      roomName: room.name,
      totalSeats,
      totalSchedules,
      totalTickets,
      totalPossibleTickets,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    }
  }

  async bulkCreateRooms(roomsData: Array<Prisma.RoomCreateInput & { cinemaId: number }>) {
    return this.prisma.$transaction(
      roomsData.map(({ cinemaId, ...roomData }) =>
        this.prisma.room.create({
          data: {
            ...roomData,
            cinema: {
              connect: { id: cinemaId },
            },
          },
        }),
      ),
    )
  }

  async bulkUpdateRooms(updates: Array<{ where: Prisma.RoomWhereUniqueInput; data: Prisma.RoomUpdateInput }>) {
    return this.prisma.$transaction(
      updates.map(({ where, data }) =>
        this.prisma.room.update({
          where,
          data,
        }),
      ),
    )
  }

  async findRoomsBySeatCapacity(minSeats: number, maxSeats?: number) {
    const where: Prisma.RoomWhereInput = {
      totalSeats: {
        gte: minSeats,
      },
    }

    if (maxSeats !== undefined) {
      where.totalSeats = {
        ...where.totalSeats,
        lte: maxSeats,
      } as any
    }

    return this.prisma.room.findMany({
      where,
      include: {
        cinema: true,
        schedules: {
          include: {
            movie: true,
          },
        },
      },
      orderBy: {
        totalSeats: 'asc',
      },
    })
  }

  async searchRoomsByText(searchText: string) {
    return this.prisma.room.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchText,
            },
          },
          {
            cinema: {
              name: {
                contains: searchText,
              },
            },
          },
        ],
      },
      include: {
        cinema: true,
        schedules: {
          include: {
            movie: true,
          },
        },
      },
    })
  }

  async getRoomStatistics(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        cinema: true,
        schedules: {
          include: {
            movie: true,
            tickets: true,
          },
        },
      },
    })

    if (!room) {
      return null
    }

    const totalSchedules = room.schedules.length
    const totalTickets = room.schedules.reduce((acc, schedule) => acc + schedule.tickets.length, 0)
    const totalRevenue = room.schedules.reduce((acc, schedule) => {
      const scheduleRevenue = schedule.tickets.reduce((ticketAcc, ticket) => ticketAcc + (ticket.price || 0), 0)
      return acc + scheduleRevenue
    }, 0)

    const upcomingSchedules = room.schedules.filter((schedule) => new Date(schedule.startTime) > new Date()).length
    const pastSchedules = totalSchedules - upcomingSchedules

    return {
      roomId,
      roomName: room.name,
      cinemaName: room.cinema.name,
      totalSeats: room.totalSeats,
      totalSchedules,
      upcomingSchedules,
      pastSchedules,
      totalTickets,
      totalRevenue,
      averageTicketsPerSchedule: totalSchedules > 0 ? totalTickets / totalSchedules : 0,
      utilizationRate: room.totalSeats > 0 ? (totalTickets / (room.totalSeats * totalSchedules)) * 100 : 0,
    }
  }

  async validateRoomData(data: Prisma.RoomCreateInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!data.name || (data.name as string).trim().length === 0) {
      errors.push('Room name is required')
    }

    if (data.totalSeats !== undefined && (data.totalSeats as number) < 1) {
      errors.push('Total seats must be at least 1')
    }

    if (data.totalSeats !== undefined && (data.totalSeats as number) > 500) {
      errors.push('Total seats cannot exceed 500')
    }

    if (!data.seatLayout || typeof data.seatLayout !== 'object') {
      errors.push('Seat layout is required and must be a valid object')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async findRoomsWithLowOccupancy(threshold: number = 0.3, days: number = 30) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const rooms = await this.findRoomsWithSchedules(startDate, endDate)

    return rooms.filter((room) => {
      const totalSchedules = room.schedules.length
      if (totalSchedules === 0) return true

      const totalTickets = room.schedules.reduce((acc, schedule) => acc + schedule.tickets.length, 0)
      const totalPossibleTickets = room.totalSeats * totalSchedules
      const occupancyRate = totalPossibleTickets > 0 ? totalTickets / totalPossibleTickets : 0

      return occupancyRate < threshold
    })
  }

  async getRoomsByCinemaWithAvailability(cinemaId: number) {
    const rooms = await this.findRoomsByCinema(cinemaId)

    return rooms.map((room) => {
      const upcomingSchedules = room.schedules.filter((schedule) => new Date(schedule.startTime) > new Date())
      const totalUpcomingTickets = upcomingSchedules.reduce(
        (acc, schedule) => acc + (schedule.tickets?.length || 0),
        0,
      )
      const availableSeats = room.totalSeats * upcomingSchedules.length - totalUpcomingTickets

      return {
        ...room,
        upcomingSchedulesCount: upcomingSchedules.length,
        totalUpcomingTickets,
        availableSeats,
        availabilityRate:
          upcomingSchedules.length > 0
            ? ((room.totalSeats * upcomingSchedules.length - totalUpcomingTickets) /
                (room.totalSeats * upcomingSchedules.length)) *
              100
            : 100,
      }
    })
  }

  async findRoomsNeedingMaintenance() {
    const rooms = await this.prisma.room.findMany({
      include: {
        schedules: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
        },
      },
    })

    return rooms.filter((room) => {
      const upcomingSchedules = room.schedules.length
      const daysUntilNextSchedule = upcomingSchedules > 0
        ? Math.floor(
            (new Date(room.schedules[0].startTime).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
          )
        : Infinity

      return upcomingSchedules === 0 || daysUntilNextSchedule > 7
    })
  }
}
