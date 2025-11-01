import { Module } from '@nestjs/common'
import { CinemaService } from '../service/cinema.service'
import { CinemaController } from '../controller/cinema.controller'
import { RoomController } from '../controller/room.controller'
import { CinemaRepository } from '../repo/cinema.repo'
import { RoomRepository } from '../repo/room.repo'
import { RoomService } from '../service/room.service'
import { SharedModule } from '../../../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [CinemaController, RoomController],
  providers: [CinemaService, CinemaRepository, RoomService, RoomRepository],
  exports: [CinemaService, CinemaRepository, RoomService, RoomRepository],
})
export class CinemaModule {}
