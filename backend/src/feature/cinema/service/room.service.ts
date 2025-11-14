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

    // Check if room has any schedules
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
}
