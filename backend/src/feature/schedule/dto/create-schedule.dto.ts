import { IsDateString, IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateScheduleDTO {
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
