import { IsString, IsInt, IsPositive, IsOptional } from 'class-validator'

export class UpdateCinemaDTO {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsInt()
  @IsPositive()
  totalRooms?: number
}
