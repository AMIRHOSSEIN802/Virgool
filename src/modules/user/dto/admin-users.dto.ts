import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Roles } from 'src/common/enums/role.eunm';

/**
 * Admin users list — pagination + filters as ONE query object (R-06): the
 * endpoint binds a single DTO so strict whitelist validation accepts every
 * known key and rejects anything else.
 */
export class AdminUserFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

  @ApiPropertyOptional({ enum: Roles })
  @IsOptional()
  @IsEnum(Roles)
  role?: string;
}
