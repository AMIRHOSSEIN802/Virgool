import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { BadRequestMessage } from 'src/common/enums/message.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class CreateBlogDto {
  @ApiProperty()
  @IsNotEmpty()
  @Length(10, 150)
  title: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  slug: string;
  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  time_for_study: string;
  @ApiPropertyOptional({ format: 'binary' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  image: string;
  @ApiProperty()
  @IsNotEmpty()
  @Length(10, 300)
  description: string;
  @ApiProperty()
  @IsNotEmpty()
  @Length(100)
  content: string;
  @ApiProperty({ type: String, isArray: true })
  @IsNotEmpty({ message: BadRequestMessage.invalidCategorise })
  categories: string[] | string;
}
export class UpdateBlogDto extends PartialType(CreateBlogDto) {}

/**
 * Feed filters for `GET /blog`. Extends PaginationDto so the SAME validated
 * object carries `page`/`limit` + `category`/`search` — the endpoint binds a
 * single query DTO, which is what lets strict whitelist validation reject
 * unknown query keys without rejecting its own known ones.
 */
export class FilterBlogDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  search?: string;
}
