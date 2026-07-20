import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './identity.service';
import { JwtPayload } from './types/authenticated-request';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant and its first OWNER user' })
  @ApiResponse({ status: 201, type: CurrentUserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserResponseDto> {
    return this.authService.register(dto, res);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in and receive session cookies' })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or no active tenant access' })
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserResponseDto> {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing, invalid, expired, or reused refresh token' })
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserResponseDto> {
    return this.authService.refresh(req.cookies?.refresh_token, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the current authenticated principal' })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  me(@CurrentUser() user: JwtPayload): CurrentUserResponseDto {
    return { userId: user.sub, tenantId: user.tenantId, role: user.role, email: user.email };
  }
}
