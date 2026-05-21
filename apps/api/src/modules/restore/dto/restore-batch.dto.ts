import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RestoreBatchDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  processInstanceIds!: string[];

  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeChildren = true;
}
