import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  ParseIntPipe,
  Request,
  Query,
  Ip,
} from '@nestjs/common'
import { PaymentService } from '../service/payment.service'
import { CreatePaymentDTO } from '../dto'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async processPayment(
    @Body(ValidationPipe) createPaymentDto: CreatePaymentDTO,
    @ActiveUser('userId') userId: number,
    @Ip() ipAddr: string,
  ) {
    return this.paymentService.processPayment(userId, createPaymentDto, ipAddr)
  }

  @Get('vnpay-return')
  async vnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentService.handleVNPayReturn(query)
  }

  @Post(':id/refund')
  @UseGuards(AccessTokenGuard)
  async refundPayment(
    @Param('id', ParseIntPipe) paymentId: number,
    @ActiveUser('userId') userId: number,
    @Body() body: { reason?: string },
  ) {
    return this.paymentService.refundPayment(paymentId, userId, body.reason)
  }

  @Post(':id/cancel')
  @UseGuards(AccessTokenGuard)
  async cancelPayment(@Param('id', ParseIntPipe) paymentId: number, @ActiveUser('userId') userId: number) {
    return this.paymentService.cancelPayment(paymentId, userId)
  }

  @Get('user/:userId')
  @UseGuards(AccessTokenGuard)
  async getUserPaymentHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @ActiveUser('userId') requestingUserId: number,
  ) {
    // Allow users to only view their own payment history (for security)
    // Admin users could bypass this check if role-based guards are implemented
    if (requestingUserId !== userId) {
      return this.paymentService.getUserPaymentHistory(requestingUserId)
    }

    return this.paymentService.getUserPaymentHistory(userId)
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async getPaymentById(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.paymentService.getPaymentById(id, userId)
  }
}
