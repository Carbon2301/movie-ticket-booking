import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common'
import { TicketService } from '../service/ticket.service'
import { BookTicketDTO } from '../dto'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('book')
  @UseGuards(AccessTokenGuard)
  async bookTickets(@Body(ValidationPipe) bookTicketDto: BookTicketDTO, @ActiveUser('userId') userId: number) {
    return this.ticketService.bookTickets(userId, bookTicketDto)
  }

  @Get('user/:userId')
  @UseGuards(AccessTokenGuard)
  async getUserTickets(@Param('userId', ParseIntPipe) userId: number, @ActiveUser('userId') requestingUserId: number) {
    if (requestingUserId !== userId) {
      return this.ticketService.getUserTickets(requestingUserId)
    }

    return this.ticketService.getUserTickets(userId)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  async cancelTicket(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.ticketService.cancelTicket(id, userId)
  }

  @Get('schedule/:scheduleId/available-seats')
  async getAvailableSeats(@Param('scheduleId', ParseIntPipe) scheduleId: number) {
    return this.ticketService.getScheduleAvailableSeats(scheduleId)
  }
}
