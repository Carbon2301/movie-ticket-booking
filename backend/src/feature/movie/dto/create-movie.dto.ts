import { IsString, IsInt, IsArray, IsDateString, IsUrl, IsOptional } from 'class-validator'

export class CreateMovieDTO {
  @IsString()
  title: string

  @IsString()
  description: string

  @IsInt()
  durationMinutes: number

  @IsString()
  genre: string

  @IsDateString()
  releaseDate: string

  @IsUrl()
  posterUrl: string

  @IsUrl()
  trailerUrl: string

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[]
}
