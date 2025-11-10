import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TicketRepository } from '../repo/ticket.repo'
import { BookTicketDTO } from '../dto'

@Injectable()
export class TicketService {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async bookTickets(userId: number, bookTicketDto: BookTicketDTO) {
    const { scheduleId, seatCodes } = bookTicketDto

    const schedule = await this.ticketRepository.getScheduleWithRoom(scheduleId)
    if (!schedule) {
      throw new NotFoundException('Schedule not found')
    }

    if (new Date() > schedule.startTime) {
      throw new BadRequestException('Cannot book tickets for past schedules')
    }

    const existingTickets = await this.ticketRepository.findExistingTickets(scheduleId, seatCodes)
    if (existingTickets.length > 0) {
      const bookedSeats = existingTickets.map((ticket) => ticket.seatCode)
      throw new BadRequestException(`Seats already booked: ${bookedSeats.join(', ')}`)
    }

    const seatLayout = schedule.room.seatLayout as any
    const validSeats = this.extractValidSeatsFromLayout(seatLayout)
    const invalidSeats = seatCodes.filter((seat) => !validSeats.includes(seat))

    if (invalidSeats.length > 0) {
      throw new BadRequestException(`Invalid seats: ${invalidSeats.join(', ')}`)
    }

    const basePrice = 100000 // 100,000 VND mặc định

    await this.ticketRepository.createTickets(userId, bookTicketDto, basePrice)

    const newTickets = await this.ticketRepository.findExistingTickets(scheduleId, seatCodes)

    return {
      message: 'Tickets booked successfully',
      scheduleId,
      seatCodes,
      totalPrice: basePrice * seatCodes.length,
      ticketIds: newTickets.map((t) => t.id),
    }
  }

  async getUserTickets(userId: number) {
    const tickets = await this.ticketRepository.findTicketsByUserId(userId)

    return {
      data: tickets.map((ticket) => ({
        id: ticket.id,
        seatCode: ticket.seatCode,
        price: Number(ticket.price),
        status: ticket.status,
        bookedAt: ticket.bookedAt,
        schedule: {
          id: ticket.schedule.id,
          startTime: ticket.schedule.startTime,
          endTime: ticket.schedule.endTime,
          movie: {
            id: ticket.schedule.movie.id,
            title: ticket.schedule.movie.title,
            posterUrl: ticket.schedule.movie.posterUrl,
          },
          room: {
            id: ticket.schedule.room.id,
            name: ticket.schedule.room.name,
            cinema: {
              id: ticket.schedule.room.cinema.id,
              name: ticket.schedule.room.cinema.name,
              location: ticket.schedule.room.cinema.location,
            },
          },
        },
      })),
    }
  }

  async cancelTicket(ticketId: number, userId: number) {
    const ticket = await this.ticketRepository.findTicketById(ticketId)

    if (!ticket) {
      throw new NotFoundException('Ticket not found')
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own tickets')
    }

    if (new Date() > ticket.schedule.startTime) {
      throw new BadRequestException('Cannot cancel tickets for past schedules')
    }

    const twoHoursBeforeShow = new Date(ticket.schedule.startTime.getTime() - 2 * 60 * 60 * 1000)
    if (new Date() > twoHoursBeforeShow) {
      throw new BadRequestException('Cannot cancel tickets within 2 hours of show time')
    }

    await this.ticketRepository.deleteTicket(ticketId)

    return {
      message: 'Ticket cancelled successfully',
      ticketId,
    }
  }

  async getScheduleAvailableSeats(scheduleId: number) {
    const schedule = await this.ticketRepository.getScheduleWithRoom(scheduleId)
    if (!schedule) {
      throw new NotFoundException('Schedule not found')
    }

    const bookedTickets = await this.ticketRepository.findTicketsByScheduleId(scheduleId)
    const bookedSeats = bookedTickets.map((ticket) => ticket.seatCode)

    const seatLayout = schedule.room.seatLayout as any
    const allSeats = this.extractValidSeatsFromLayout(seatLayout)
    const availableSeats = allSeats.filter((seat) => !bookedSeats.includes(seat))

    return {
      scheduleId,
      totalSeats: allSeats.length,
      bookedSeats: bookedSeats.length,
      availableSeats: availableSeats.length,
      availableSeatCodes: availableSeats,
      bookedSeatCodes: bookedSeats,
    }
  }

  private extractValidSeatsFromLayout(seatLayout: any): string[] {
    const validSeats: string[] = []

    if (seatLayout && seatLayout.rows && Array.isArray(seatLayout.rows)) {
      const seatsPerRow = seatLayout.seatsPerRow || 10 // Default to 10 if not specified

      for (const rowName of seatLayout.rows) {
        for (let i = 1; i <= seatsPerRow; i++) {
          validSeats.push(`${rowName}${i}`)
        }
      }
    }

    // If no layout found, generate a default layout
    if (validSeats.length === 0) {
      const rows = ['A', 'B', 'C', 'D', 'E']
      const seatsPerRow = 10

      for (const row of rows) {
        for (let i = 1; i <= seatsPerRow; i++) {
          validSeats.push(`${row}${i}`)
        }
      }
    }

    return validSeats
  }
}
