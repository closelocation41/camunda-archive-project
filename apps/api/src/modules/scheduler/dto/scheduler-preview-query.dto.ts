import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SchedulerPreviewQueryDto {
  @ApiPropertyOptional({ enum: ['COMPLETED', 'FAILED', 'SUSPENDED'], default: 'COMPLETED' })
  @IsOptional()
  @IsIn(['COMPLETED', 'FAILED', 'SUSPENDED'])
  mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED' = 'COMPLETED';

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 25;
}
