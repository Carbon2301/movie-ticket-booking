import {
  IsString,
  IsInt,
  IsArray,
  IsDateString,
  IsUrl,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateMovieDTO {
  @IsString({ message: 'Title phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Title không được để trống' })
  @MinLength(1, { message: 'Title phải có ít nhất 1 ký tự' })
  @MaxLength(255, { message: 'Title không được quá 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  title: string

  @IsString({ message: 'Description phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Description không được để trống' })
  @MaxLength(5000, { message: 'Description không được quá 5000 ký tự' })
  @Transform(({ value }) => value?.trim())
  description: string

  @IsInt({ message: 'Duration phải là số nguyên' })
  @Min(1, { message: 'Duration phải lớn hơn 0' })
  @Max(500, { message: 'Duration không được quá 500 phút' })
  @Transform(({ value }) => parseInt(value))
  durationMinutes: number

  @IsString({ message: 'Genre phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Genre không được để trống' })
  @MaxLength(100, { message: 'Genre không được quá 100 ký tự' })
  @Transform(({ value }) => value?.trim())
  genre: string

  @IsDateString({}, { message: 'Release date phải là định dạng ISO 8601' })
  releaseDate: string

  @IsUrl({}, { message: 'Poster URL không hợp lệ' })
  @IsNotEmpty({ message: 'Poster URL không được để trống' })
  posterUrl: string

  @IsUrl({}, { message: 'Trailer URL không hợp lệ' })
  @IsNotEmpty({ message: 'Trailer URL không được để trống' })
  trailerUrl: string

  @IsOptional()
  @IsArray({ message: 'Category IDs phải là mảng' })
  @IsInt({ each: true, message: 'Mỗi category ID phải là số nguyên' })
  categoryIds?: number[]
}
