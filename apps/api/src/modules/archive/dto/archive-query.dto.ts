import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ArchiveQueryDto {
  @ApiPropertyOptional({ description: 'Search by process instance id, business key, or process definition key.', example: 'invoice' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['COMPLETED', 'FAILED', 'SUSPENDED'], description: 'Filter archived workflow state.' })
  @IsOptional()
  @IsIn(['COMPLETED', 'FAILED', 'SUSPENDED'])
  state?: string;

  @ApiPropertyOptional({ default: 1, example: 1, description: 'One-based result page.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, example: 10, description: 'Rows per page. The web UI uses 10.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 10;
}
