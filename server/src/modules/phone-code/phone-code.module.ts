import { Module } from '@nestjs/common';
import { PhoneCodeCacheKeysHelper } from './constants';
import { PhoneCodeController } from './phone-code.controller';
import { PhoneCodeRepository } from './phone-code.repository';
import { PhoneCodeService } from './phone-code.service';

@Module({
  controllers: [PhoneCodeController],
  providers: [PhoneCodeService, PhoneCodeRepository, PhoneCodeCacheKeysHelper],
  exports: [PhoneCodeService],
})
export class PhoneCodeModule {}
