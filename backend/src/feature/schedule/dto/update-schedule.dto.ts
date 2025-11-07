import { IsDateString, IsInt, IsNotEmpty } from "class-validator";

export class UpdateScheduleDTO {
  @IsNotEmpty()
  @IsInt()
  movieId: number

  @IsNotEmpty()
  @IsInt()
  roomId: number

  @IsNotEmpty()
  @IsDateString()
  startTime: string
}
