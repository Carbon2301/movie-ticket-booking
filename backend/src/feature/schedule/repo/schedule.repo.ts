import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class ScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ScheduleCreateInput) {
    return this.prisma.schedule.create({
      data,
      include: {
        movie: true,
        room: {
          include: {
            cinema: true,
          },
        },
      },
    })
  }

  async findById(id: number) {
    return this.prisma.schedule.findUnique({
      where: { id },
      include: {
        movie: true,
        room: {
          include: {
            cinema: true,
          },
        },
      },
    })
  }

  async findByMovieId(movieId: number, date?: string) {
    const whereClause: Prisma.ScheduleWhereInput = { movieId }

    if (date) {
      const startOfDay = new Date(date)
      const endOfDay = new Date(date)
      endOfDay.setDate(endOfDay.getDate() + 1)

      whereClause.startTime = {
        gte: startOfDay,
        lt: endOfDay,
      }
    }

    return this.prisma.schedule.findMany({
      where: whereClause,
      include: {
        movie: true,
        room: {
          include: {
            cinema: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })
  }

  async update(id: number, data: Prisma.ScheduleUpdateInput) {
    return this.prisma.schedule.update({
      where: { id },
      data,
      include: {
        movie: true,
        room: {
          include: {
            cinema: true,
          },
        },
      },
    })
  }

  async delete(id: number) {
    return this.prisma.schedule.delete({
      where: { id },
    })
  }

  async findConflictingSchedule(movieId: number, roomId: number, startTime: Date, excludeId?: number) {
    const whereClause: Prisma.ScheduleWhereInput = {
      movieId,
      roomId,
      startTime,
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    return this.prisma.schedule.findFirst({
      where: whereClause,
    })
  }

  async findMovieById(id: number) {
    return this.prisma.movie.findUnique({
      where: { id },
    })
  }

  async findRoomById(id: number) {
    return this.prisma.room.findUnique({
      where: { id },
    })
  }

  async countTicketsByScheduleId(scheduleId: number) {
    return this.prisma.ticket.count({
      where: { scheduleId },
    })
  }
}
