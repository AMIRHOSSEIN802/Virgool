import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class CreateCommentDto {
  @ApiProperty()
  @Length(5)
  text: string;
  @ApiProperty()
  @IsNumberString()
  blogId: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  parentId: number;
}

/**
 * B7 edit: ONLY the text is updatable. Ownership (userId), placement (blogId,
 * parentId) and moderation state (accepted) are structurally absent from this
 * DTO, so body manipulation can never reach the entity through it.
 */
export class UpdateCommentDto {
  @ApiProperty()
  @Length(5)
  text: string;
}

/**
 * Query for the admin comment list (`GET /blog-comment`). The moderation
 * filter (`accepted`) lives inside the DTO together with pagination so the
 * strict whitelist pipe can validate the whole query object in one binding.
 */
export class CommentListQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 10)
  accepted?: string;
}
