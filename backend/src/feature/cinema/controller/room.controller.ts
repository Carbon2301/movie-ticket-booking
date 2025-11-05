import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import { RoomService } from '../service/room.service'
import { CreateRoomDTO, UpdateRoomDTO } from '../dto'
import { AccessTokenGuard } from '../../../shared/guards/access-token.guard'

@Controller('cinema/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  // @Roles('admin')
  async createRoom(@Body(ValidationPipe) createRoomDto: CreateRoomDTO) {
    return this.roomService.createRoom(createRoomDto)
  }

  @Get(':id')
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.getRoomById(id)
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard)
  // @Roles('admin')
  async updateRoom(@Param('id', ParseIntPipe) id: number, @Body(ValidationPipe) updateRoomDto: UpdateRoomDTO) {
    return this.roomService.updateRoom(id, updateRoomDto)
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  // @Roles('admin')
  async deleteRoom(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.deleteRoom(id)
  }
}
