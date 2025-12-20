import { Injectable } from '@nestjs/common'

interface SeatLock {
  userId: number
  seatCode: string
  scheduleId: number
  lockedAt: Date
  socketId: string
}

@Injectable()
export class SeatLockService {
  private lockedSeats: Map<number, Map<string, SeatLock>> = new Map()

  private userLocks: Map<string, SeatLock[]> = new Map()

  // Timeout for auto-release (5 minutes)
  private readonly LOCK_TIMEOUT = 5 * 60 * 1000

  lockSeat(scheduleId: number, seatCode: string, userId: number, socketId: string): boolean {
    if (!this.lockedSeats.has(scheduleId)) {
      this.lockedSeats.set(scheduleId, new Map())
    }

    const scheduleSeats = this.lockedSeats.get(scheduleId)!

    // Check if seat is already locked by someone else
    if (scheduleSeats.has(seatCode)) {
      const lock = scheduleSeats.get(seatCode)!
      // If locked by same user, allow (re-lock)
      if (lock.userId !== userId) {
        return false
      }
    }

    const lock: SeatLock = {
      userId,
      seatCode,
      scheduleId,
      lockedAt: new Date(),
      socketId,
    }

    scheduleSeats.set(seatCode, lock)

    // Track by user socket
    if (!this.userLocks.has(socketId)) {
      this.userLocks.set(socketId, [])
    }
    this.userLocks.get(socketId)!.push(lock)

    // Auto-release after timeout
    setTimeout(() => {
      this.unlockSeat(scheduleId, seatCode, userId)
    }, this.LOCK_TIMEOUT)

    return true
  }

  unlockSeat(scheduleId: number, seatCode: string, userId: number): boolean {
    const scheduleSeats = this.lockedSeats.get(scheduleId)
    if (!scheduleSeats) return false

    const lock = scheduleSeats.get(seatCode)
    if (!lock || lock.userId !== userId) return false

    scheduleSeats.delete(seatCode)

    // Remove from user locks
    const userSeats = this.userLocks.get(lock.socketId)
    if (userSeats) {
      const index = userSeats.findIndex((l) => l.scheduleId === scheduleId && l.seatCode === seatCode)
      if (index !== -1) {
        userSeats.splice(index, 1)
      }
    }

    return true
  }

  unlockAllSeatsForSocket(socketId: string): SeatLock[] {
    const locks = this.userLocks.get(socketId) || []

    locks.forEach((lock) => {
      const scheduleSeats = this.lockedSeats.get(lock.scheduleId)
      if (scheduleSeats) {
        scheduleSeats.delete(lock.seatCode)
      }
    })

    this.userLocks.delete(socketId)
    return locks
  }

  getLockedSeatsForSchedule(scheduleId: number): string[] {
    const scheduleSeats = this.lockedSeats.get(scheduleId)
    if (!scheduleSeats) return []

    return Array.from(scheduleSeats.keys())
  }

  isLocked(scheduleId: number, seatCode: string): boolean {
    const scheduleSeats = this.lockedSeats.get(scheduleId)
    if (!scheduleSeats) return false

    return scheduleSeats.has(seatCode)
  }

  getLockInfo(scheduleId: number, seatCode: string): SeatLock | null {
    const scheduleSeats = this.lockedSeats.get(scheduleId)
    if (!scheduleSeats) return null

    return scheduleSeats.get(seatCode) || null
  }

  clearExpiredLocks(): void {
    const now = new Date()

    this.lockedSeats.forEach((scheduleSeats, scheduleId) => {
      scheduleSeats.forEach((lock, seatCode) => {
        const lockAge = now.getTime() - lock.lockedAt.getTime()
        if (lockAge > this.LOCK_TIMEOUT) {
          scheduleSeats.delete(seatCode)

          // Remove from user locks
          const userSeats = this.userLocks.get(lock.socketId)
          if (userSeats) {
            const index = userSeats.findIndex((l) => l.scheduleId === scheduleId && l.seatCode === seatCode)
            if (index !== -1) {
              userSeats.splice(index, 1)
            }
          }
        }
      })
    })
  }
}
