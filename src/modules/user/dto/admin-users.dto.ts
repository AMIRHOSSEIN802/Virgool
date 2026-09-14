import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Admin users list filters — everything is optional; search is a plain term. */
export class AdminUserFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['admin', 'user'] })
  @IsOptional()
  @IsString()
  role?: string;
}
