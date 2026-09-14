import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, Length } from 'class-validator';

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
