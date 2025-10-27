import { IsOptional, IsString, IsInt, Min } from 'class-validator'
import { Transform } from 'class-transformer'

export class MovieQueryDTO {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  genre?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 10
}
