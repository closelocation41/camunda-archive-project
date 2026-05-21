import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsString } from 'class-validator';

export class ArchiveSelectedDto {
  @ApiProperty({ enum: ['COMPLETED', 'FAILED'] })
  @IsIn(['COMPLETED', 'FAILED'])
  mode!: 'COMPLETED' | 'FAILED';

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  processInstanceIds!: string[];
}
