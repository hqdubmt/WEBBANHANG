import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductSource } from '../../../database/entities/product.entity';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiPropertyOptional({ enum: ProductSource })
  @IsOptional()
  @IsEnum(ProductSource)
  source?: ProductSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  affiliateLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  commission?: number;
}
