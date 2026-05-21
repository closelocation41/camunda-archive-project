import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { Role } from './roles';

const DEMO_USERS = [
  { username: 'admin', password: 'admin', roles: [Role.Admin] },
  { username: 'operator', password: 'operator', roles: [Role.Operator] },
  { username: 'auditor', password: 'auditor', roles: [Role.Auditor] },
  { username: 'viewer', password: 'viewer', roles: [Role.Viewer] },
];

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(dto: LoginDto) {
    const user = DEMO_USERS.find((candidate) => candidate.username === dto.username && candidate.password === dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: this.jwtService.sign({ sub: user.username, username: user.username, roles: user.roles }),
      user: { username: user.username, roles: user.roles },
    };
  }
}
