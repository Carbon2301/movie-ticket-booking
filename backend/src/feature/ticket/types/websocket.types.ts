// WebSocket Events for Ticket Booking

// Client to Server Events
export interface ClientToServerEvents {
  joinSchedule: (data: { scheduleId: number }) => void
  leaveSchedule: (data: { scheduleId: number }) => void
  lockSeat: (data: { scheduleId: number; seatCode: string; userId: number }) => void
  unlockSeat: (data: { scheduleId: number; seatCode: string; userId: number }) => void
}

// Server to Client Events
export interface ServerToClientEvents {
  scheduleState: (data: {
    scheduleId: number
    lockedSeats: string[]
    bookedSeats: string[]
  }) => void
  seatLocked: (data: { scheduleId: number; seatCode: string; userId: number }) => void
  seatUnlocked: (data: { scheduleId: number; seatCode: string }) => void
  seatBooked: (data: { scheduleId: number; seatCode: string }) => void
  lockSuccess: (data: { scheduleId: number; seatCode: string }) => void
  lockFailed: (data: { scheduleId: number; seatCode: string; reason: string }) => void
  unlockSuccess: (data: { scheduleId: number; seatCode: string }) => void
}
