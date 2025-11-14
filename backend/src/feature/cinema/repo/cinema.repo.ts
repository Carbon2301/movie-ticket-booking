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
}
