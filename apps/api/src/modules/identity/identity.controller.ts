import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './identity.service';
import { AcceptInviteDto } from './membership/dto/accept-invite.dto';
import { InviteMembershipDto } from './membership/dto/invite-membership.dto';
import { InviteResponseDto } from './membership/dto/invite-response.dto';
import { MembershipService } from './membership/membership.service';
import { JwtPayload } from './types/authenticated-request';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(
    private readonly authService: AuthService,
    private readonly membershipService: MembershipService,
  ) {}

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

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out the current session (revokes only this refresh token, not other devices)' })
  @ApiResponse({ status: 204 })
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    return this.authService.logout(req.cookies?.refresh_token, res);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Invite (or resend an invite to) a member of the current tenant' })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  @ApiResponse({ status: 403, description: 'Only an OWNER may invite another OWNER' })
  @ApiResponse({ status: 409, description: 'Already an active member of this tenant' })
  invite(@Body() dto: InviteMembershipDto, @CurrentUser() user: JwtPayload): Promise<InviteResponseDto> {
    return this.membershipService.invite(dto, user.role);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept an invite: set a password and activate tenant membership' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: 'Invite is invalid, expired, or already used' })
  @HttpCode(HttpStatus.NO_CONTENT)
  acceptInvite(@Body() dto: AcceptInviteDto): Promise<void> {
    return this.membershipService.acceptInvite(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request a password reset - always responds the same way regardless of whether the email exists' })
  @ApiResponse({ status: 204 })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset a password using a forgot-password token; invalidates all existing sessions' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or already-used reset token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto);
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
