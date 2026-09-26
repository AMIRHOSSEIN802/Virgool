import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Confirmation payload for DELETE /user/account.
 *
 * Only the confirmation text is accepted here — the account to delete always
 * comes from the authenticated request (req.user), never from the body, so a
 * hostile client cannot target someone else's account.
 */
export class DeleteAccountDto {
  @ApiProperty({
    description: 'Must exactly match the authenticated user username',
    example: 'm_1',
  })
  @IsString()
  @IsNotEmpty()
  username: string;
}
