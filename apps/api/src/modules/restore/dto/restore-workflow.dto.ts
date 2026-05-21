import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RestoreWorkflowDto {
  @ApiProperty({
    description: 'Archived Camunda process instance id to re-sync back into Camunda history tables.',
    example: '623a3e07-54d4-11f1-940b-0242ac120006',
  })
  @IsString()
  processInstanceId!: string;

  @ApiProperty({ description: 'Operator reason recorded in arc_restore_log.', example: 'Operator requested re-sync from archive' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ default: true, description: 'Also re-sync child process history discovered from super_process_instance_id_.' })
  @IsOptional()
  @IsBoolean()
  includeChildren = true;
}
