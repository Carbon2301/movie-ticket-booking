import { IsString, IsInt, IsPositive, IsObject } from 'class-validator'

export class CreateRoomDTO {
  @IsInt()
  cinemaId: number

  @IsString()
  name: string

  @IsInt()
  @IsPositive()
  totalSeats: number

  @IsObject()
  seatLayout: Record<string, any> // Layout ghế ngồi (có thể customize theo yêu cầu)
}
