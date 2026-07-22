import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsString()
  @Matches(/^postgresql:\/\//, { message: 'DATABASE_URL must be a postgresql:// connection string' })
  DATABASE_URL!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : parseInt(value, 10)))
  PORT: number = 3001;

  @IsOptional()
  @IsIn(Object.values(NodeEnv))
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_PRIVATE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_PUBLIC_KEY!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TOKEN_TTL: string = '15m';

  @IsOptional()
  @IsString()
  JWT_REFRESH_TOKEN_TTL: string = '30d';

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  COOKIE_SECURE: boolean = false;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((origin: string) => origin.trim())
          .filter((origin: string) => origin.length > 0)
      : value,
  )
  CORS_ALLOWED_ORIGINS!: string[];

  @IsOptional()
  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
  LOG_LEVEL: string = 'info';
}
