import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'عنوان دسته باید متن باشد' })
  @IsNotEmpty({ message: 'عنوان دسته نمی‌تواند خالی باشد' })
  @Length(2, 30, { message: 'عنوان دسته باید بین ۲ تا ۳۰ کاراکتر باشد' })
  title: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt({ message: 'اولویت باید عدد صحیح باشد' })
  @Min(0)
  priority: number;
}
