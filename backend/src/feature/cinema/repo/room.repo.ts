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
}
