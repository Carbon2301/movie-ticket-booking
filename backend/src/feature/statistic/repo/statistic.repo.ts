import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/services/prisma.service'

export interface RevenueStatistic {
  date: string
  revenue: number
  totalBookings: number
}

export interface BookingStatistic {
  date: string
  totalBookings: number
  totalTickets: number
}

@Injectable()
export class StatisticRepo {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueStatistics(
    period: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueStatistic[]> {
    const where: any = {}

    if (startDate && endDate) {
      where.paidAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Get payment data with booking information
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'completed',
        ...where,
      },
      include: {
        bookings: true,
      },
      orderBy: {
        paidAt: 'asc',
      },
    })

    // Group by period
    const groupedData: { [key: string]: { revenue: number; bookings: number } } = {}

    payments.forEach((payment) => {
      let dateKey: string
      const paymentDate = new Date(payment.paidAt)

      switch (period) {
        case 'day':
          dateKey = paymentDate.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(paymentDate)
          weekStart.setDate(paymentDate.getDate() - paymentDate.getDay())
          dateKey = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          dateKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
          break
      }

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { revenue: 0, bookings: 0 }
      }

      groupedData[dateKey].revenue += Number(payment.amount)
      groupedData[dateKey].bookings += payment.bookings.length
    })

    return Object.entries(groupedData).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      totalBookings: data.bookings,
    }))
  }

  async getBookingStatistics(startDate?: Date, endDate?: Date): Promise<BookingStatistic[]> {
    const where: any = {}

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        bookingTickets: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Group by day
    const groupedData: { [key: string]: { bookings: number; tickets: number } } = {}

    bookings.forEach((booking) => {
      const dateKey = new Date(booking.createdAt).toISOString().split('T')[0]

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { bookings: 0, tickets: 0 }
      }

      groupedData[dateKey].bookings += 1
      groupedData[dateKey].tickets += booking.bookingTickets.length
    })

    return Object.entries(groupedData).map(([date, data]) => ({
      date,
      totalBookings: data.bookings,
      totalTickets: data.tickets,
    }))
  }
}
