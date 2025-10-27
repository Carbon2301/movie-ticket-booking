import { IsString, IsInt, IsArray, IsDateString, IsUrl, IsOptional } from 'class-validator'

export class UpdateMovieDTO {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  durationMinutes?: number

  @IsOptional()
  @IsString()
  genre?: string

  @IsOptional()
  @IsDateString()
  releaseDate?: string

  @IsOptional()
  @IsUrl()
  posterUrl?: string

  @IsOptional()
  @IsUrl()
  trailerUrl?: string

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[]
}
