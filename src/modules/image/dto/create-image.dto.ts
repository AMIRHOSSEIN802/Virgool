import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  alt: string;
  @ApiProperty()
  @IsString()
  name: string;
  // The file itself travels as multipart `req.file`, never as a body field —
  // it stays optional here so a text-only body passes validation.
  @ApiProperty({ format: 'binary' })
  @IsOptional()
  @IsString()
  image: string;
}
