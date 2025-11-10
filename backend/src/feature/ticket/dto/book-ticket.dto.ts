import { IsInt, IsString, IsArray, IsDecimal, Min } from 'class-validator'

export class BookTicketDTO {
  @IsInt()
  @Min(1)
  scheduleId: number

  @IsArray()
  @IsString({ each: true })
  seatCodes: string[]
}
