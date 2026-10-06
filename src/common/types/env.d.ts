namespace NodeJS {
  interface ProcessEnv {
    //Application
    PORT: number;
    //Database
    DB_PORT: number;
    DB_NAME: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_HOST: string;
    //secrets
    COOKIE_SECRET: string;
    OTP_TOKEN_SECRET: string;
    ACCESS_TOKEN_SECRET: string;
    EMAIL_TOKEN_SECRET: string;
    PHONE_TOKEN_SECRET: string;
    //Auth sessions (R-05) — optional; defaults shown in .env.example
    /** Access-token lifetime, e.g. `15m` (default `15m`). */
    ACCESS_TOKEN_TTL?: string;
    /** Refresh cookie + session lifetime in days (default `30`). */
    REFRESH_TOKEN_TTL_DAYS?: string;
    /** Comma-separated origins allowed on cookie endpoints / OAuth redirect. */
    FRONTEND_ORIGIN?: string;
    //GOOGLE
    GOOGLE_CLIENT_ID: string;
    GOOGLE_SECRET_ID: string;
  }
}
