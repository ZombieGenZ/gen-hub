import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Lấy danh sách ngôn ngữ được phép từ biến môi trường
 */
function getAllowedLanguages(): string[] {
  const allowedLangs = process.env.ALLOWED_LANGUAGES || 'vi,en';
  return allowedLangs.split(',').map((lang) => lang.trim().toLowerCase());
}

/**
 * Validator kiểm tra ngôn ngữ có hợp lệ hay không
 * Ngôn ngữ được coi là hợp lệ nếu nó nằm trong danh sách ALLOWED_LANGUAGES (case-insensitive)
 */
@ValidatorConstraint({ name: 'isValidLanguage', async: false })
export class IsValidLanguageConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (value === undefined || value === null) {
      return true; // Optional field
    }

    if (typeof value !== 'string') {
      return false;
    }

    const normalizedValue = value.trim().toLowerCase();
    const allowedLanguages = getAllowedLanguages();

    return allowedLanguages.includes(normalizedValue);
  }

  defaultMessage(_args: ValidationArguments): string {
    const allowedLanguages = getAllowedLanguages();
    return `Ngôn ngữ không hợp lệ. Chỉ hỗ trợ: ${allowedLanguages.join(', ')}`;
  }
}

/**
 * Custom decorator để validate ngôn ngữ
 * Sử dụng: @IsValidLanguage() trên trường language trong DTO
 */
export function IsValidLanguage(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidLanguageConstraint,
    });
  };
}

/**
 * Normalize ngôn ngữ (lowercase và trim)
 */
export function normalizeLanguage(language: string | undefined | null): string {
  if (!language) {
    return 'vi'; // Mặc định tiếng Việt
  }
  return language.trim().toLowerCase();
}
