import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { ScheduleRepository } from '../repo/schedule.repo'
import { CreateScheduleDTO, UpdateScheduleDTO } from '../dto/index'

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  /**
   * Convert UTC datetime string to GMT+7 Date for database storage
   * Frontend sends UTC time, backend converts to GMT+7 before saving to database
   *
   * Example: "2024-01-15T07:00:00.000Z" (UTC) -> Date representing 14:00 GMT+7
   */
  private convertUTCToGMT7(dateTimeString: string): Date {
    // Parse the UTC datetime string
    const utcDate = new Date(dateTimeString)

    // Validate the date
    if (isNaN(utcDate.getTime())) {
      throw new BadRequestException('Invalid datetime format. Could not parse date string')
    }


    const gmt7Date = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000)

    return gmt7Date
  }

  async create(createScheduleDto: CreateScheduleDTO) {
    const { movieId, roomId, startTime } = createScheduleDto

    const movie = await this.scheduleRepository.findMovieById(movieId)

    if (!movie) {
      throw new NotFoundException('Movie not found')
    }

    const room = await this.scheduleRepository.findRoomById(roomId)

    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Convert UTC datetime from frontend to GMT+7 for database storage
    const startDateTime = this.convertUTCToGMT7(startTime)
    const endDateTime = new Date(startDateTime.getTime() + movie.durationMinutes * 60 * 1000)

    const conflictingSchedule = await this.scheduleRepository.findConflictingSchedule(movieId, roomId, startDateTime)

    if (conflictingSchedule) {
      throw new BadRequestException('Schedule conflict: Same movie, room, and start time already exists')
    }

    return this.scheduleRepository.create({
      movie: { connect: { id: movieId } },
      room: { connect: { id: roomId } },
      startTime: startDateTime,
      endTime: endDateTime,
      createdAt: new Date(),
    })
  }

  async findById(id: number) {
    const schedule = await this.scheduleRepository.findById(id)

    if (!schedule) {
      throw new NotFoundException('Schedule not found')
    }

    return schedule
  }

  async findByMovieId(movieId: number, date?: string) {
    const movie = await this.scheduleRepository.findMovieById(movieId)

    if (!movie) {
      throw new NotFoundException('Movie not found')
    }

    return this.scheduleRepository.findByMovieId(movieId, date)
  }

  async update(id: number, updateScheduleDto: UpdateScheduleDTO) {
    const { movieId, roomId, startTime } = updateScheduleDto

    const existingSchedule = await this.scheduleRepository.findById(id)
    if (!existingSchedule) {
      throw new NotFoundException('Schedule not found')
    }

    const movie = await this.scheduleRepository.findMovieById(movieId)

    if (!movie) {
      throw new NotFoundException('Movie not found')
    }

    const room = await this.scheduleRepository.findRoomById(roomId)

    if (!room) {
      throw new NotFoundException('Room not found')
    }

    // Convert UTC datetime from frontend to GMT+7 for database storage
    const startDateTime = this.convertUTCToGMT7(startTime)
    const endDateTime = new Date(startDateTime.getTime() + movie.durationMinutes * 60 * 1000)

    const conflictingSchedule = await this.scheduleRepository.findConflictingSchedule(
      movieId,
      roomId,
      startDateTime,
      id,
    )

    if (conflictingSchedule) {
      throw new BadRequestException('Schedule conflict: Same movie, room, and start time already exists')
    }

    return this.scheduleRepository.update(id, {
      movie: { connect: { id: movieId } },
      room: { connect: { id: roomId } },
      startTime: startDateTime,
      endTime: endDateTime,
    })
  }

  async delete(id: number) {
    const existingSchedule = await this.scheduleRepository.findById(id)
    if (!existingSchedule) {
      throw new NotFoundException('Schedule not found')
    }

    const ticketCount = await this.scheduleRepository.countTicketsByScheduleId(id)

    if (ticketCount > 0) {
      throw new BadRequestException('Cannot delete schedule with existing tickets')
    }

    await this.scheduleRepository.delete(id)
    return {
      message: 'Schedule deleted successfully',
    }
  }
}
