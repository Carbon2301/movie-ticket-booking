import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PaymentRepository } from '../repo/payment.repo'
import { CreatePaymentDTO } from '../dto'
import { VNPayService } from './vnpay.service'

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly vnpayService: VNPayService,
  ) {}

  async processPayment(userId: number, createPaymentDto: CreatePaymentDTO, ipAddr?: string) {
    const { ticketIds, method } = createPaymentDto

    const tickets = await this.paymentRepository.findTicketsByIds(ticketIds)

    if (tickets.length !== ticketIds.length) {
      throw new NotFoundException('Some tickets not found')
    }

    const userTickets = tickets.filter((ticket) => ticket.userId === userId)
    if (userTickets.length !== tickets.length) {
      throw new ForbiddenException('You can only pay for your own tickets')
    }

    // Check if tickets are in BOOKED status (not already paid or cancelled)
    const bookableTickets = tickets.filter((ticket) => ticket.status === 'BOOKED')
    if (bookableTickets.length !== tickets.length) {
      const invalidTickets = tickets.filter((ticket) => ticket.status !== 'BOOKED')
      throw new BadRequestException(
        `Some tickets cannot be paid for. Invalid tickets: ${invalidTickets.map((t) => t.id).join(', ')}`,
      )
    }

    // Calculate total amount automatically from tickets
    const totalAmount = tickets.reduce((sum, ticket) => sum + Number(ticket.price), 0)

    // Check if any schedule has passed
    const currentTime = new Date()
    const expiredTickets = tickets.filter((ticket) => currentTime > ticket.schedule.startTime)
    if (expiredTickets.length > 0) {
      throw new BadRequestException('Cannot pay for tickets with expired schedules')
    }

    // If payment method is E_WALLET, create VNPay payment URL
    if (method === 'E_WALLET' && ipAddr) {
      // Create payment record with PENDING status first to get paymentId
      const paymentDto = {
        ...createPaymentDto,
        amount: totalAmount,
      }

      const result = await this.paymentRepository.createPaymentWithBooking(userId, {
        ...paymentDto,
        status: 'PENDING',
      })

      // Use paymentId in orderId for easy tracking
      const orderId = `MOVIE_${Date.now()}_${result.payment.id}`
      const orderInfo = `Payment for ${tickets.length} movie tickets - ${tickets[0].schedule.movie.title}`

      const paymentUrl = this.vnpayService.createPaymentUrl(totalAmount, orderInfo, orderId, ipAddr)

      return {
        message: 'VNPay payment URL created',
        paymentId: result.payment.id,
        bookingId: result.booking.id,
        amount: Number(result.payment.amount),
        method: result.payment.method,
        status: 'PENDING',
        paymentUrl,
        orderId,
        ticketsCount: ticketIds.length,
      }
    }

    // For other payment methods, process directly
    const paymentDto = {
      ...createPaymentDto,
      amount: totalAmount,
    }

    const result = await this.paymentRepository.createPaymentWithBooking(userId, paymentDto)

    return {
      message: 'Payment processed successfully',
      paymentId: result.payment.id,
      bookingId: result.booking.id,
      amount: Number(result.payment.amount),
      method: result.payment.method,
      status: result.payment.status,
      paidAt: result.payment.paidAt,
      ticketsCount: ticketIds.length,
    }
  }

  async handleVNPayReturn(vnpParams: Record<string, string>) {
    const verificationResult = this.vnpayService.verifyReturnUrl(vnpParams)

    if (!verificationResult.isValid) {
      throw new BadRequestException('Invalid VNPay signature')
    }

    const { responseCode, orderId, amount } = verificationResult

    // Extract payment ID from orderId format: MOVIE_timestamp_paymentId
    const orderIdParts = orderId.split('_')
    if (orderIdParts.length < 3) {
      throw new BadRequestException('Invalid order ID format')
    }
    const paymentId = parseInt(orderIdParts[2])

    if (responseCode === '00') {
      // Payment successful
      await this.paymentRepository.updatePaymentStatus(paymentId, 'COMPLETED')
      return {
        message: 'Payment completed successfully',
        status: 'success',
        paymentId,
        amount,
        responseCode,
      }
    } else {
      // Payment cancelled or failed - delete tickets and update payment status
      const payment = await this.paymentRepository.findPaymentById(paymentId)

      if (!payment) {
        throw new NotFoundException('Payment not found')
      }

      // Get ticket IDs from payment bookings
      const ticketIds = payment.bookings.flatMap((booking) => booking.bookingTickets.map((bt) => bt.ticket.id))

      // Delete tickets from database
      if (ticketIds.length > 0) {
        await this.paymentRepository.deleteTickets(ticketIds)
      }

      if (responseCode === '24') {
        // User cancelled payment
        await this.paymentRepository.updatePaymentStatus(paymentId, 'CANCELLED')
        return {
          message: 'Payment was cancelled by user',
          status: 'cancelled',
          paymentId,
          amount,
          responseCode,
        }
      } else {
        // Payment failed (other error codes)
        await this.paymentRepository.updatePaymentStatus(paymentId, 'FAILED')
        return {
          message: 'Payment failed',
          status: 'failed',
          paymentId,
          responseCode,
          amount,
        }
      }
    }
  }

  async refundPayment(paymentId: number, userId: number, reason?: string) {
    const payment = await this.paymentRepository.findPaymentById(paymentId)

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('You can only refund your own payments')
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed payments can be refunded')
    }

    // Check if the show time is at least 2 hours away
    const booking = payment.bookings[0]
    if (booking && booking.bookingTickets.length > 0) {
      const showTime = booking.bookingTickets[0].ticket.schedule.startTime
      const currentTime = new Date()
      const timeDifference = showTime.getTime() - currentTime.getTime()
      const hoursUntilShow = timeDifference / (1000 * 60 * 60)

      if (hoursUntilShow < 2) {
        throw new BadRequestException('Refunds are only available until 2 hours before show time')
      }
    }

    // Update payment status to REFUNDED
    await this.paymentRepository.updatePaymentStatus(paymentId, 'REFUNDED')

    // Update related tickets status to CANCELLED
    const ticketIds = payment.bookings.flatMap((booking) => booking.bookingTickets.map((bt) => bt.ticket.id))

    await this.paymentRepository.updateTicketsStatus(ticketIds, 'REFUNDED')

    return {
      message: 'Payment refunded successfully',
      paymentId,
      refundAmount: Number(payment.amount),
      refundedAt: new Date(),
      reason: reason || 'Customer request',
    }
  }

  async cancelPayment(paymentId: number, userId: number) {
    const payment = await this.paymentRepository.findPaymentById(paymentId)

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own payments')
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Only pending payments can be cancelled')
    }

    // Update payment status to CANCELLED
    await this.paymentRepository.updatePaymentStatus(paymentId, 'CANCELLED')

    // Delete related tickets from database
    const ticketIds = payment.bookings.flatMap((booking) => booking.bookingTickets.map((bt) => bt.ticket.id))

    await this.paymentRepository.deleteTickets(ticketIds)

    return {
      message: 'Payment cancelled successfully',
      paymentId,
      cancelledAt: new Date(),
    }
  }

  async getUserPaymentHistory(userId: number) {
    const payments = await this.paymentRepository.findPaymentsByUserId(userId)
    const stats = await this.paymentRepository.getUserTotalSpent(userId)

    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount: Number(payment.amount),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        bookings: payment.bookings.map((booking) => ({
          id: booking.id,
          totalPrice: Number(booking.totalPrice),
          status: booking.status,
          tickets: booking.bookingTickets.map((bt) => ({
            id: bt.ticket.id,
            seatCode: bt.ticket.seatCode,
            price: Number(bt.ticket.price),
            status: bt.ticket.status,
            schedule: {
              id: bt.ticket.schedule.id,
              startTime: bt.ticket.schedule.startTime,
              endTime: bt.ticket.schedule.endTime,
              movie: {
                id: bt.ticket.schedule.movie.id,
                title: bt.ticket.schedule.movie.title,
                posterUrl: bt.ticket.schedule.movie.posterUrl,
              },
              room: {
                id: bt.ticket.schedule.room.id,
                name: bt.ticket.schedule.room.name,
                cinema: {
                  id: bt.ticket.schedule.room.cinema.id,
                  name: bt.ticket.schedule.room.cinema.name,
                  location: bt.ticket.schedule.room.cinema.location,
                },
              },
            },
          })),
        })),
      })),
      stats: {
        totalSpent: stats.totalSpent,
        totalPayments: stats.totalPayments,
      },
    }
  }

  async getPaymentById(paymentId: number, userId: number) {
    const payment = await this.paymentRepository.findPaymentById(paymentId)

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('You can only view your own payments')
    }

    return {
      id: payment.id,
      method: payment.method,
      amount: Number(payment.amount),
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      bookings: payment.bookings.map((booking) => ({
        id: booking.id,
        totalPrice: Number(booking.totalPrice),
        status: booking.status,
        tickets: booking.bookingTickets.map((bt) => ({
          id: bt.ticket.id,
          seatCode: bt.ticket.seatCode,
          price: Number(bt.ticket.price),
          status: bt.ticket.status,
          schedule: {
            id: bt.ticket.schedule.id,
            startTime: bt.ticket.schedule.startTime,
            endTime: bt.ticket.schedule.endTime,
            movie: {
              id: bt.ticket.schedule.movie.id,
              title: bt.ticket.schedule.movie.title,
              posterUrl: bt.ticket.schedule.movie.posterUrl,
            },
            room: {
              id: bt.ticket.schedule.room.id,
              name: bt.ticket.schedule.room.name,
              cinema: {
                id: bt.ticket.schedule.room.cinema.id,
                name: bt.ticket.schedule.room.cinema.name,
                location: bt.ticket.schedule.room.cinema.location,
              },
            },
          },
        })),
      })),
    }
  }
}
