import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validator kiểm tra một trường Date phải nhỏ hơn trường khác
 * Sử dụng: @Validate(IsBeforeConstraint, ['ends_at'])
 */
@ValidatorConstraint({ name: 'isBefore', async: false })
export class IsBeforeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints as string[];
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedPropertyName
    ];

    // Nếu một trong hai giá trị không tồn tại, bỏ qua validation
    if (
      value === undefined ||
      value === null ||
      relatedValue === undefined ||
      relatedValue === null
    ) {
      return true;
    }

    const currentDate =
      value instanceof Date ? value : new Date(value as string);
    const relatedDate =
      relatedValue instanceof Date
        ? relatedValue
        : new Date(relatedValue as string);

    return currentDate < relatedDate;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as string[];
    return `${args.property} phải nhỏ hơn ${relatedPropertyName}`;
  }
}

/**
 * Custom decorator để validate một Date phải trước một Date khác
 * Sử dụng: @IsBefore('ends_at') trên trường starts_at trong DTO
 */
export function IsBefore(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsBeforeConstraint,
    });
  };
}
