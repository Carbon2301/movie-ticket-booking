import { Module } from '@nestjs/common'
import { TicketService } from '../service/ticket.service'
import { TicketController } from '../controller/ticket.controller'
import { TicketRepository } from '../repo/ticket.repo'
import { SeatLockService } from '../service/seat-lock.service'
import { TicketGateway } from '../gateway/ticket.gateway'
import { SharedModule } from '../../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [TicketController],
  providers: [TicketService, TicketRepository, SeatLockService, TicketGateway],
  exports: [TicketService, TicketRepository, SeatLockService, TicketGateway],
})
export class TicketModule {}
