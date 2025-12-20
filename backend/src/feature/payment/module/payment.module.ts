import { Module } from '@nestjs/common'
import { PaymentService } from '../service/payment.service'
import { PaymentController } from '../controller/payment.controller'
import { PaymentRepository } from '../repo/payment.repo'
import { VNPayService } from '../service/vnpay.service'
import { SharedModule } from '../../../shared/shared.module'
import { TicketModule } from '../../ticket/module/ticket.module'

@Module({
  imports: [SharedModule, TicketModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, VNPayService],
  exports: [PaymentService, PaymentRepository, VNPayService],
})
export class PaymentModule {}
