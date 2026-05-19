declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    UPLOADTHING_TOKEN: string;
  }
}

