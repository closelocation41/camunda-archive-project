import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsString } from 'class-validator';

export class ArchiveSelectedDto {
  @ApiProperty({ enum: ['COMPLETED', 'FAILED'], description: 'Workflow history state being archived.' })
  @IsIn(['COMPLETED', 'FAILED'])
  mode!: 'COMPLETED' | 'FAILED';

  @ApiProperty({
    type: [String],
    description: 'Camunda process instance ids selected in the Completed or Failed workflow list.',
    example: ['623a3e07-54d4-11f1-940b-0242ac120006'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  processInstanceIds!: string[];
}
