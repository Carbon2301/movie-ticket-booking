import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { BookTicketDTO } from '../dto'

@Injectable()
export class TicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTicketsByUserId(userId: number) {
    return this.prisma.ticket.findMany({
      where: {
        userId,
      },
      include: {
        schedule: {
          include: {
            movie: true,
            room: {
              include: {
                cinema: true,
              },
            },
          },
        },
      },
      orderBy: {
        bookedAt: 'desc',
      },
    })
  }

  async findTicketById(id: number) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            movie: true,
            room: {
              include: {
                cinema: true,
              },
            },
          },
        },
        user: true,
      },
    })
  }

  async findExistingTickets(scheduleId: number, seatCodes: string[]) {
    return this.prisma.ticket.findMany({
      where: {
        scheduleId,
        seatCode: {
          in: seatCodes,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })
  }

  async getScheduleWithRoom(scheduleId: number) {
    return this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        room: true,
        movie: true,
      },
    })
  }

  async createTickets(userId: number, bookTicketDto: BookTicketDTO, price: number) {
    const ticketsData = bookTicketDto.seatCodes.map((seatCode) => ({
      userId,
      scheduleId: bookTicketDto.scheduleId,
      seatCode,
      price,
      status: 'BOOKED',
      bookedAt: new Date(),
    }))

    return this.prisma.ticket.createMany({
      data: ticketsData,
    })
  }

  async deleteTicket(id: number) {
    return this.prisma.ticket.delete({
      where: { id },
    })
  }

  async findTicketsByScheduleId(scheduleId: number) {
    return this.prisma.ticket.findMany({
      where: {
        scheduleId,
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        seatCode: true,
      },
    })
  }
}
