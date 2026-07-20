import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

/** Documents a paginated list response for a given item DTO without needing a bespoke Paginated<Entity>ResponseDto class per module. */
export function ApiPaginatedResponse(itemType: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(PaginationMetaDto, itemType),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(itemType) } },
              meta: { $ref: getSchemaPath(PaginationMetaDto) },
            },
          },
        ],
      },
    }),
  );
}
