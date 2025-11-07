import { IsOptional, IsDateString } from 'class-validator'

export class ScheduleQueryDTO {
  @IsOptional()
  @IsDateString()
  date?: string
}
