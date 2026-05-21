import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RestoreBatchDto {
  @ApiProperty({
    type: [String],
    description: 'Archived Camunda process instance ids selected in Archived Workflows.',
    example: ['623a3e07-54d4-11f1-940b-0242ac120006', 'd21106e4-5489-11f1-940b-0242ac120006'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  processInstanceIds!: string[];

  @ApiProperty({ description: 'Operator reason recorded in arc_restore_log for each process id.', example: 'Bulk re-sync for investigation' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ default: true, description: 'Also re-sync child process history for every selected process id.' })
  @IsOptional()
  @IsBoolean()
  includeChildren = true;
}
