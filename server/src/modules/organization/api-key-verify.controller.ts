import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { IsNotEmpty, IsString } from 'class-validator';
import { OrganizationService } from './organization.service';
import { Public } from '../../common/decorators';
import {
    GetResponse,
    ResponseCode,
} from '../../common/responses';

class VerifyApiKeyDto {
    @IsNotEmpty()
    @IsString()
    api_key: string;
}

@ApiTags('API Key Verification')
@Controller('api-keys')
export class ApiKeyVerifyController {
    constructor(private readonly service: OrganizationService) { }

    @Post('verify')
    @Public()
    @ApiOperation({ summary: 'Verify API key và lấy thông tin' })
    @ApiBody({
        description: 'API key cần verify',
        schema: {
            type: 'object',
            properties: {
                api_key: { type: 'string', example: 'GENHUB-A1B2C3D4E5F6789012345678901234AB' },
            },
            required: ['api_key'],
        },
    })
    async verify(
        @Body() dto: VerifyApiKeyDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getApiKeyByPlainKey(dto.api_key, lang);
        return new GetResponse(
            ResponseCode.APIKEY_VERIFY_SUCCESS,
            result,
            'Verify API key thành công',
        );
    }
}
