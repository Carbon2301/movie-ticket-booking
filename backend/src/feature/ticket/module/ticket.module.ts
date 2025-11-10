import { Module } from '@nestjs/common'
import { TicketService } from '../service/ticket.service'
import { TicketController } from '../controller/ticket.controller'
import { TicketRepository } from '../repo/ticket.repo'
import { SharedModule } from '../../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [TicketController],
  providers: [TicketService, TicketRepository],
  exports: [TicketService, TicketRepository],
})
export class TicketModule {}
