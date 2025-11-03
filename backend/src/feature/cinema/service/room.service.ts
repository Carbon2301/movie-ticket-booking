import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { RoomRepository } from '../repo/room.repo'
import { CreateRoomDTO, UpdateRoomDTO } from '../dto'
import { CinemaService } from './cinema.service'

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly cinemaService: CinemaService,
  ) {}

  async createRoom(createRoomDto: CreateRoomDTO) {
    const { cinemaId, ...roomData } = createRoomDto

    const cinema = await this.cinemaService.getCinemaById(cinemaId)

    const currentRoomCount = await this.roomRepository.countRoomsByCinema(cinemaId)
    if (currentRoomCount >= cinema.totalRooms) {
      throw new BadRequestException(`Cannot create more rooms. Cinema already has maximum ${cinema.totalRooms} rooms`)
    }

    if (roomData.totalSeats <= 0) {
      throw new BadRequestException('Room total seats must be greater than 0')
    }

    const existingRoom = await this.roomRepository.findUnique({ cinemaId_name: { cinemaId, name: roomData.name } })
    if (existingRoom) {
      throw new BadRequestException('Room with this name already exists')
    }

    const room = await this.roomRepository.create({
      ...roomData,
      cinema: {
        connect: { id: cinemaId },
      },
      createdAt: new Date(),
    })

    return room
  }

  async getRoomById(id: number) {
    const room = await this.roomRepository.findUnique({ id })
    if (!room) {
      throw new NotFoundException('Room not found')
    }
    return room
  }

  async updateRoom(id: number, updateRoomDto: UpdateRoomDTO) {
    await this.getRoomById(id)

    const room = await this.roomRepository.update({
      where: { id },
      data: updateRoomDto,
    })

    return room
  }

  async deleteRoom(id: number) {
    const room = await this.getRoomById(id)

    const scheduleCount = await this.roomRepository.countSchedules(id)
    if (scheduleCount > 0) {
      throw new BadRequestException('Cannot delete room with existing schedules')
    }

    try {
      await this.roomRepository.delete({ id })
      return {
        message: `Room "${room.name}" has been successfully deleted`,
        deletedRoomId: id,
      }
    } catch (error) {
      throw new BadRequestException('Failed to delete room. Please try again later.')
    }
  }

  async getRoomsByCinema(cinemaId: number) {
    await this.cinemaService.getCinemaById(cinemaId)
    return this.roomRepository.findRoomsByCinema(cinemaId)
  }

  async getAvailableRooms(cinemaId?: number) {
    return this.roomRepository.findAvailableRooms(cinemaId)
  }

  async getRoomsWithSchedulesInDateRange(startDate: Date, endDate: Date) {
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date')
    }
    return this.roomRepository.findRoomsWithSchedules(startDate, endDate)
  }

  async getRoomOccupancyRate(roomId: number, startDate: Date, endDate: Date) {
    await this.getRoomById(roomId)
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date')
    }
    const occupancyRate = await this.roomRepository.getRoomOccupancyRate(roomId, startDate, endDate)
    if (!occupancyRate) {
      throw new NotFoundException('Room occupancy rate not found')
    }
    return occupancyRate
  }

  async bulkCreateRooms(roomsData: Array<CreateRoomDTO>) {
    if (!roomsData || roomsData.length === 0) {
      throw new BadRequestException('Rooms data is required')
    }

    const validationResults = await Promise.all(
      roomsData.map((data) => {
        const { cinemaId, ...roomData } = data
        return this.roomRepository.validateRoomData(roomData as any)
      }),
    )

    const invalidRooms = validationResults.filter((result) => !result.valid)
    if (invalidRooms.length > 0) {
      const allErrors = invalidRooms.flatMap((result) => result.errors)
      throw new BadRequestException(`Validation failed: ${allErrors.join(', ')}`)
    }

    for (const roomData of roomsData) {
      const cinema = await this.cinemaService.getCinemaById(roomData.cinemaId)
      const currentRoomCount = await this.roomRepository.countRoomsByCinema(roomData.cinemaId)
      if (currentRoomCount >= cinema.totalRooms) {
        throw new BadRequestException(
          `Cannot create more rooms for cinema ${cinema.name}. Maximum rooms reached.`,
        )
      }

      const existingRoom = await this.roomRepository.findUnique({
        cinemaId_name: { cinemaId: roomData.cinemaId, name: roomData.name },
      })
      if (existingRoom) {
        throw new BadRequestException(`Room "${roomData.name}" already exists in this cinema`)
      }
    }

    const prismaData = roomsData.map((data) => {
      const { cinemaId, ...roomData } = data
      return {
        ...roomData,
        cinema: {
          connect: { id: cinemaId },
        },
      }
    })

    return this.roomRepository.bulkCreateRooms(prismaData as any)
  }

  async bulkUpdateRooms(updates: Array<{ id: number; data: UpdateRoomDTO }>) {
    if (!updates || updates.length === 0) {
      throw new BadRequestException('Updates data is required')
    }

    await Promise.all(updates.map((update) => this.getRoomById(update.id)))

    const prismaUpdates = updates.map((update) => ({
      where: { id: update.id },
      data: update.data,
    }))

    return this.roomRepository.bulkUpdateRooms(prismaUpdates)
  }

  async getRoomsBySeatCapacity(minSeats: number, maxSeats?: number) {
    if (minSeats < 1) {
      throw new BadRequestException('Minimum seats must be at least 1')
    }
    if (maxSeats !== undefined && maxSeats < minSeats) {
      throw new BadRequestException('Maximum seats must be greater than or equal to minimum seats')
    }
    return this.roomRepository.findRoomsBySeatCapacity(minSeats, maxSeats)
  }

  async searchRoomsByText(searchText: string) {
    if (!searchText || searchText.trim().length === 0) {
      throw new BadRequestException('Search text is required')
    }
    return this.roomRepository.searchRoomsByText(searchText)
  }

  async getRoomStatistics(roomId: number) {
    await this.getRoomById(roomId)
    const statistics = await this.roomRepository.getRoomStatistics(roomId)
    if (!statistics) {
      throw new NotFoundException('Room statistics not found')
    }
    return statistics
  }

  async validateRoomBeforeCreation(createRoomDto: CreateRoomDTO) {
    const { cinemaId, ...roomData } = createRoomDto

    const validation = await this.roomRepository.validateRoomData(roomData as any)
    if (!validation.valid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const cinema = await this.cinemaService.getCinemaById(cinemaId)
    const currentRoomCount = await this.roomRepository.countRoomsByCinema(cinemaId)
    if (currentRoomCount >= cinema.totalRooms) {
      throw new BadRequestException(`Cannot create more rooms. Cinema already has maximum ${cinema.totalRooms} rooms`)
    }

    const existingRoom = await this.roomRepository.findUnique({
      cinemaId_name: { cinemaId, name: roomData.name },
    })
    if (existingRoom) {
      throw new BadRequestException('Room with this name already exists in this cinema')
    }

    return { valid: true }
  }

  async getRoomWithDetailedInfo(id: number) {
    const room = await this.getRoomById(id)
    const statistics = await this.getRoomStatistics(id)

    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    const occupancyRate = await this.roomRepository.getRoomOccupancyRate(id, startDate, endDate)

    return {
      ...room,
      statistics,
      occupancyRate,
    }
  }

  async updateRoomWithValidation(id: number, updateRoomDto: UpdateRoomDTO) {
    await this.getRoomById(id)

    if (updateRoomDto.totalSeats !== undefined) {
      if (updateRoomDto.totalSeats < 1) {
        throw new BadRequestException('Total seats must be at least 1')
      }
      if (updateRoomDto.totalSeats > 500) {
        throw new BadRequestException('Total seats cannot exceed 500')
      }
    }

    return this.updateRoom(id, updateRoomDto)
  }

  async deleteRoomWithConfirmation(id: number, confirmationCode: string) {
    if (confirmationCode !== `DELETE_ROOM_${id}`) {
      throw new BadRequestException('Invalid confirmation code')
    }
    return this.deleteRoom(id)
  }

  async getRoomsWithLowOccupancy(threshold: number = 0.3, days: number = 30) {
    if (threshold < 0 || threshold > 1) {
      throw new BadRequestException('Threshold must be between 0 and 1')
    }
    if (days < 1 || days > 365) {
      throw new BadRequestException('Days must be between 1 and 365')
    }
    return this.roomRepository.findRoomsWithLowOccupancy(threshold, days)
  }

  async getRoomsByCinemaWithAvailability(cinemaId: number) {
    await this.cinemaService.getCinemaById(cinemaId)
    return this.roomRepository.getRoomsByCinemaWithAvailability(cinemaId)
  }

  async getRoomsNeedingMaintenance() {
    return this.roomRepository.findRoomsNeedingMaintenance()
  }

  async getRoomRevenueReport(roomId: number, startDate: Date, endDate: Date) {
    const room = await this.getRoomById(roomId)

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date')
    }

    const roomsWithSchedules = await this.roomRepository.findRoomsWithSchedules(startDate, endDate)
    const targetRoom = roomsWithSchedules.find((r) => r.id === roomId)

    if (!targetRoom) {
      return {
        roomId,
        roomName: room.name,
        totalRevenue: 0,
        totalTickets: 0,
        totalSchedules: 0,
        averageRevenuePerSchedule: 0,
        period: {
          startDate,
          endDate,
        },
      }
    }

    let totalRevenue = 0
    let totalTickets = 0

    targetRoom.schedules.forEach((schedule) => {
      const scheduleTickets = (schedule as any).tickets || []
      totalTickets += scheduleTickets.length
      scheduleTickets.forEach((ticket: any) => {
        totalRevenue += ticket.price || 0
      })
    })

    const totalSchedules = targetRoom.schedules.length

    return {
      roomId,
      roomName: room.name,
      cinemaName: targetRoom.cinema.name,
      totalRevenue,
      totalTickets,
      totalSchedules,
      averageRevenuePerSchedule: totalSchedules > 0 ? totalRevenue / totalSchedules : 0,
      period: {
        startDate,
        endDate,
      },
    }
  }

  async getAllRooms(queryDto?: { skip?: number; take?: number; cinemaId?: number }) {
    const { skip, take, cinemaId } = queryDto || {}
    const where: any = {}
    if (cinemaId) {
      where.cinemaId = cinemaId
    }

    return this.roomRepository.findMany({
      skip,
      take,
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async getRoomPerformanceMetrics(roomId: number, days: number = 30) {
    const room = await this.getRoomById(roomId)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const occupancyRate = await this.getRoomOccupancyRate(roomId, startDate, endDate)
    const revenueReport = await this.getRoomRevenueReport(roomId, startDate, endDate)
    const statistics = await this.getRoomStatistics(roomId)

    return {
      roomId,
      roomName: room.name,
      period: {
        startDate,
        endDate,
        days,
      },
      occupancyRate,
      revenueReport,
      statistics,
      performanceScore: this.calculatePerformanceScore(occupancyRate, revenueReport, statistics),
    }
  }

  private calculatePerformanceScore(
    occupancyRate: any,
    revenueReport: any,
    statistics: any,
  ): number {
    const occupancyScore = occupancyRate?.occupancyRate || 0
    const revenueScore = revenueReport.totalRevenue > 0 ? Math.min(revenueReport.totalRevenue / 1000000, 1) : 0
    const utilizationScore = statistics?.utilizationRate || 0

    return Math.round(((occupancyScore + revenueScore + utilizationScore) / 3) * 100) / 100
  }
}
