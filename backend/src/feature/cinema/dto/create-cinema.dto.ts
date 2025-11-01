import { IsString, IsInt, IsPositive } from 'class-validator'

export class CreateCinemaDTO {
  @IsString()
  name: string

  @IsString()
  location: string

  @IsInt()
  @IsPositive()
  totalRooms: number
}
