import { IsString, IsInt, IsPositive, IsObject, IsOptional } from 'class-validator'

export class UpdateRoomDTO {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsInt()
  @IsPositive()
  totalSeats?: number

  @IsOptional()
  @IsObject()
  seatLayout?: Record<string, any>
}
