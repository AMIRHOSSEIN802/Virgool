import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/auth/google/redirect',
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, _refreshToken: string, profile: Profile) {
    const { name, emails, photos } = profile;

    const [emailData] = emails ?? [];
    const [image] = photos ?? [];

    return {
      firstName: name?.givenName,
      lastName: name?.familyName,
      email: emailData?.value,
      profile_image: image?.value,
      accessToken,
    };
  }
}
