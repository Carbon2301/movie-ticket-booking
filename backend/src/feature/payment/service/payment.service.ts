import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PaymentRepository } from '../repo/payment.repo'
import { CreatePaymentDTO } from '../dto'
import { VNPayService } from './vnpay.service'
import { TicketGateway } from '../../ticket/gateway/ticket.gateway'
import { Cron, CronExpression } from '@nestjs/schedule'

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly vnpayService: VNPayService,
    private readonly ticketGateway: TicketGateway,
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

      // Get ticket details before deletion for WebSocket notification
      const ticketsToDelete = payment.bookings.flatMap((booking) =>
        booking.bookingTickets.map((bt) => ({
          scheduleId: bt.ticket.scheduleId,
          seatCode: bt.ticket.seatCode,
        })),
      )

      // Delete tickets from database
      if (ticketIds.length > 0) {
        await this.paymentRepository.deleteTickets(ticketIds)

        // Notify WebSocket clients that seats are available again
        // Group by scheduleId to send notifications efficiently
        const seatsBySchedule = ticketsToDelete.reduce(
          (acc, ticket) => {
            if (!acc[ticket.scheduleId]) {
              acc[ticket.scheduleId] = []
            }
            acc[ticket.scheduleId].push(ticket.seatCode)
            return acc
          },
          {} as Record<number, string[]>,
        )

        Object.entries(seatsBySchedule).forEach(([scheduleId, seatCodes]) => {
          this.ticketGateway.notifySeatCancelled(Number(scheduleId), seatCodes)
        })
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

    // Update payment status to REFUND_REQUESTED (waiting for admin approval)
    await this.paymentRepository.updatePaymentStatusWithReason(paymentId, 'REFUND_REQUESTED', reason)

    return {
      message: 'Refund request submitted successfully. Waiting for admin approval.',
      paymentId,
      refundAmount: Number(payment.amount),
      requestedAt: new Date(),
      reason: reason || 'Customer request',
      status: 'REFUND_REQUESTED',
    }
  }

  async getAllRefundRequests() {
    const payments = await this.paymentRepository.findPaymentsByStatus('REFUND_REQUESTED')

    return payments.map((payment) => {
      const booking = payment.bookings[0]
      const tickets = booking?.bookingTickets?.map((bt) => bt.ticket) || []
      const schedule = tickets[0]?.schedule

      return {
        id: payment.id,
        userId: payment.userId,
        user: {
          id: payment.user.id,
          name: payment.user.name,
          email: payment.user.email,
        },
        amount: Number(payment.amount),
        method: payment.method,
        reason: (payment as any).reason || 'No reason provided',
        requestedAt: (payment as any).requestedAt || payment.createdAt,
        movie: schedule?.movie,
        schedule: schedule
          ? {
              id: schedule.id,
              startTime: schedule.startTime,
              room: schedule.room,
            }
          : null,
        tickets: tickets.map((t) => ({
          id: t.id,
          seatCode: t.seatCode,
          price: Number(t.price),
          status: t.status,
        })),
      }
    })
  }

  async approveRefund(paymentId: number) {
    const payment = await this.paymentRepository.findPaymentById(paymentId)

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.status !== 'REFUND_REQUESTED') {
      throw new BadRequestException('Payment is not in REFUND_REQUESTED status')
    }

    // Keep payment status as REFUND_REQUESTED (do not change to REFUNDED)
    // Only update related tickets status to REFUNDED
    const ticketIds = payment.bookings.flatMap((booking) => booking.bookingTickets.map((bt) => bt.ticket.id))

    await this.paymentRepository.updateTicketsStatus(ticketIds, 'REFUND_APPROVED')

    return {
      message: 'Refund approved successfully',
      paymentId,
      refundAmount: Number(payment.amount),
      refundedAt: new Date(),
      // Keep status as REFUND_REQUESTED
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

    // Notify WebSocket clients that seats are available again
    const ticketsToNotify = payment.bookings.flatMap((booking) =>
      booking.bookingTickets.map((bt) => ({
        scheduleId: bt.ticket.scheduleId,
        seatCode: bt.ticket.seatCode,
      })),
    )

    const seatsBySchedule = ticketsToNotify.reduce(
      (acc, ticket) => {
        if (!acc[ticket.scheduleId]) {
          acc[ticket.scheduleId] = []
        }
        acc[ticket.scheduleId].push(ticket.seatCode)
        return acc
      },
      {} as Record<number, string[]>,
    )

    Object.entries(seatsBySchedule).forEach(([scheduleId, seatCodes]) => {
      this.ticketGateway.notifySeatCancelled(Number(scheduleId), seatCodes)
    })

    return {
      message: 'Payment cancelled successfully',
      paymentId,
      cancelledAt: new Date(),
    }
  }

  // Auto-cancel pending payments every 5 minutes
  @Cron(CronExpression.EVERY_30_SECONDS)
  async autoCancelPendingPayments() {
    try {
      const pendingPayments = await this.paymentRepository.findPaymentsByStatus('PENDING')

      if (pendingPayments.length === 0) {
        return
      }

      console.log(`[Auto-Cancel] Found ${pendingPayments.length} pending payments to cancel`)

      for (const payment of pendingPayments) {
        try {
          // Check if payment has been pending for more than 5 minutes
          const createdAt = new Date(payment.createdAt)
          const now = new Date()
          const minutesPending = (now.getTime() - createdAt.getTime()) / (1000 * 60)

          if (minutesPending >= 0.5) {
            // Cancel the payment using internal logic (without userId check)
            await this.paymentRepository.updatePaymentStatus(payment.id, 'CANCELLED')

            // Delete related tickets
            const ticketIds = payment.bookings.flatMap((booking) => booking.bookingTickets.map((bt) => bt.ticket.id))

            if (ticketIds.length > 0) {
              await this.paymentRepository.deleteTickets(ticketIds)

              // Notify WebSocket clients that seats are available again
              const ticketsToNotify = payment.bookings.flatMap((booking) =>
                booking.bookingTickets.map((bt) => ({
                  scheduleId: bt.ticket.scheduleId,
                  seatCode: bt.ticket.seatCode,
                })),
              )

              const seatsBySchedule = ticketsToNotify.reduce(
                (acc, ticket) => {
                  if (!acc[ticket.scheduleId]) {
                    acc[ticket.scheduleId] = []
                  }
                  acc[ticket.scheduleId].push(ticket.seatCode)
                  return acc
                },
                {} as Record<number, string[]>,
              )

              Object.entries(seatsBySchedule).forEach(([scheduleId, seatCodes]) => {
                this.ticketGateway.notifySeatCancelled(Number(scheduleId), seatCodes)
              })
            }

            console.log(`[Auto-Cancel] Successfully cancelled payment #${payment.id}`)
          }
        } catch (error) {
          console.error(`[Auto-Cancel] Failed to cancel payment #${payment.id}:`, error.message)
        }
      }

      console.log(`[Auto-Cancel] Completed auto-cancel task`)
    } catch (error) {
      console.error('[Auto-Cancel] Error in auto-cancel task:', error.message)
    }
  }

  async removeRefundedPayment(paymentId: number, userId: number) {
    const payment = await this.paymentRepository.findPaymentById(paymentId)

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('You can only remove your own payments')
    }

    if (payment.status !== 'REFUND_REQUESTED') {
      throw new BadRequestException('Only refunded payments can be removed')
    }

    // Check if tickets are in REFUND_APPROVED status
    const ticketIds = payment.bookings.flatMap((booking) => booking.bookingTickets.map((bt) => bt.ticket.id))
    const tickets = await this.paymentRepository.findTicketsByIds(ticketIds)

    const allRefundApproved = tickets.every((ticket) => ticket.status === 'REFUND_APPROVED')
    if (!allRefundApproved) {
      throw new BadRequestException('All tickets must be in REFUND_APPROVED status')
    }

    // Delete related tickets from database (same logic as cancelPayment)
    await this.paymentRepository.deleteTickets(ticketIds)

    // Update payment status to CANCELLED (mark as removed)
    await this.paymentRepository.updatePaymentStatus(paymentId, 'CANCELLED')

    return {
      message: 'Refunded payment removed successfully',
      paymentId,
      removedAt: new Date(),
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
