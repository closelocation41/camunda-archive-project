import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSchedulerJobDto {
  @ApiProperty({ enum: ['ARCHIVE_COMPLETED', 'ARCHIVE_FAILED', 'ARCHIVE_SUSPENDED'], example: 'ARCHIVE_COMPLETED' })
  @IsIn(['ARCHIVE_COMPLETED', 'ARCHIVE_FAILED', 'ARCHIVE_SUSPENDED'])
  jobType!: 'ARCHIVE_COMPLETED' | 'ARCHIVE_FAILED' | 'ARCHIVE_SUSPENDED';

  @ApiPropertyOptional({ enum: ['COMPLETED_TO_ARCHIVE', 'ARCHIVE_TO_COMPLETE'], default: 'COMPLETED_TO_ARCHIVE' })
  @IsOptional()
  @IsIn(['COMPLETED_TO_ARCHIVE', 'ARCHIVE_TO_COMPLETE'])
  workflowType: 'COMPLETED_TO_ARCHIVE' | 'ARCHIVE_TO_COMPLETE' = 'COMPLETED_TO_ARCHIVE';

  @ApiPropertyOptional({ enum: ['CURRENT', 'LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'LAST_1_YEAR', 'ALL'], default: 'CURRENT' })
  @IsOptional()
  @IsIn(['CURRENT', 'LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'LAST_1_YEAR', 'ALL'])
  rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL' = 'CURRENT';

  @ApiProperty({ example: 'Nightly completed workflow archive' })
  @IsString()
  jobName!: string;

  @ApiProperty({ example: '2026-07-08T20:00:00.000Z' })
  @IsDateString()
  scheduledStartTime!: string;

  @ApiPropertyOptional({ enum: ['SEQUENTIAL', 'PARALLEL'], default: 'SEQUENTIAL' })
  @IsOptional()
  @IsIn(['SEQUENTIAL', 'PARALLEL'])
  processingMode: 'SEQUENTIAL' | 'PARALLEL' = 'SEQUENTIAL';

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  selectedWorkflowCount = 25;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateRangeStart?: string;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateRangeEnd?: string;
}
