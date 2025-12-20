import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { SeatLockService } from '../service/seat-lock.service'
import { TicketRepository } from '../repo/ticket.repo'
import { Logger } from '@nestjs/common'

interface LockSeatPayload {
  scheduleId: number
  seatCode: string
  userId: number
}

interface UnlockSeatPayload {
  scheduleId: number
  seatCode: string
  userId: number
}

interface JoinSchedulePayload {
  scheduleId: number
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/tickets',
})
export class TicketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(TicketGateway.name)

  constructor(
    private readonly seatLockService: SeatLockService,
    private readonly ticketRepository: TicketRepository,
  ) {
    // Clean expired locks every minute
    setInterval(() => {
      this.seatLockService.clearExpiredLocks()
    }, 60000)
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)

    // Release all locks for this socket
    const releasedLocks = this.seatLockService.unlockAllSeatsForSocket(client.id)

    // Notify other clients about released seats
    releasedLocks.forEach((lock) => {
      this.server.to(`schedule-${lock.scheduleId}`).emit('seatUnlocked', {
        scheduleId: lock.scheduleId,
        seatCode: lock.seatCode,
      })
    })
  }

  @SubscribeMessage('joinSchedule')
  async handleJoinSchedule(@MessageBody() data: JoinSchedulePayload, @ConnectedSocket() client: Socket) {
    const { scheduleId } = data

    // Join the room for this schedule
    client.join(`schedule-${scheduleId}`)

    // Get currently locked seats
    const lockedSeats = this.seatLockService.getLockedSeatsForSchedule(scheduleId)

    // Get booked seats from database
    const bookedTickets = await this.ticketRepository.findTicketsByScheduleId(scheduleId)
    const bookedSeats = bookedTickets.map((ticket) => ticket.seatCode)

    // Send current state to the joining client
    client.emit('scheduleState', {
      scheduleId,
      lockedSeats,
      bookedSeats,
    })

    this.logger.log(`Client ${client.id} joined schedule ${scheduleId}`)
  }

  @SubscribeMessage('leaveSchedule')
  handleLeaveSchedule(@MessageBody() data: JoinSchedulePayload, @ConnectedSocket() client: Socket) {
    const { scheduleId } = data
    client.leave(`schedule-${scheduleId}`)
    this.logger.log(`Client ${client.id} left schedule ${scheduleId}`)
  }

  @SubscribeMessage('lockSeat')
  async handleLockSeat(@MessageBody() data: LockSeatPayload, @ConnectedSocket() client: Socket) {
    const { scheduleId, seatCode, userId } = data

    // Check if seat is already booked in database
    const existingTickets = await this.ticketRepository.findExistingTickets(scheduleId, [seatCode])
    if (existingTickets.length > 0) {
      client.emit('lockFailed', {
        scheduleId,
        seatCode,
        reason: 'Seat already booked',
      })
      return
    }

    // Try to lock the seat
    const locked = this.seatLockService.lockSeat(scheduleId, seatCode, userId, client.id)

    if (locked) {
      // Notify all clients in this schedule room about the locked seat
      this.server.to(`schedule-${scheduleId}`).emit('seatLocked', {
        scheduleId,
        seatCode,
        userId,
      })

      client.emit('lockSuccess', {
        scheduleId,
        seatCode,
      })

      this.logger.log(`Seat ${seatCode} locked for schedule ${scheduleId} by user ${userId}`)
    } else {
      client.emit('lockFailed', {
        scheduleId,
        seatCode,
        reason: 'Seat is already locked by another user',
      })
    }
  }

  @SubscribeMessage('unlockSeat')
  handleUnlockSeat(@MessageBody() data: UnlockSeatPayload, @ConnectedSocket() client: Socket) {
    const { scheduleId, seatCode, userId } = data

    const unlocked = this.seatLockService.unlockSeat(scheduleId, seatCode, userId)

    if (unlocked) {
      // Notify all clients in this schedule room
      this.server.to(`schedule-${scheduleId}`).emit('seatUnlocked', {
        scheduleId,
        seatCode,
      })

      client.emit('unlockSuccess', {
        scheduleId,
        seatCode,
      })

      this.logger.log(`Seat ${seatCode} unlocked for schedule ${scheduleId}`)
    }
  }

  // Method to be called after successful booking
  notifySeatBooked(scheduleId: number, seatCodes: string[]) {
    seatCodes.forEach((seatCode) => {
      this.server.to(`schedule-${scheduleId}`).emit('seatBooked', {
        scheduleId,
        seatCode,
      })
    })
  }

  // Method to be called after ticket cancellation
  notifySeatCancelled(scheduleId: number, seatCodes: string[]) {
    seatCodes.forEach((seatCode) => {
      this.server.to(`schedule-${scheduleId}`).emit('seatCancelled', {
        scheduleId,
        seatCode,
      })
    })
  }
}
