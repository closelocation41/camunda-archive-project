import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RestoreWorkflowDto {
  @ApiProperty()
  @IsString()
  processInstanceId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeChildren = true;
}
