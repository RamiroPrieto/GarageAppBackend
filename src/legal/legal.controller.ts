import {
  applyDecorators,
  Controller,
  Get,
  Header,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { getLegalIdentity } from './legal.identity';
import { renderLegalPage } from './legal.renderer';
import {
  LEGAL_LANGUAGES,
  type LegalLanguage,
  type LegalPage,
} from './legal.types';

const LegalRoute = (page: LegalPage) =>
  applyDecorators(
    Get(page),
    Header('Content-Type', 'text/html; charset=utf-8'),
    Header(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'",
    ),
    Header('Vary', 'Accept-Language'),
  );

// Public pages required by the app stores.
@Controller()
export class LegalController {
  @LegalRoute('privacy')
  privacy(@Req() request: Request, @Query('lang') lang?: unknown) {
    return this.render('privacy', request, lang);
  }

  @LegalRoute('terms')
  terms(@Req() request: Request, @Query('lang') lang?: unknown) {
    return this.render('terms', request, lang);
  }

  @LegalRoute('delete-account')
  deleteAccount(@Req() request: Request, @Query('lang') lang?: unknown) {
    return this.render('delete-account', request, lang);
  }

  @LegalRoute('support')
  support(@Req() request: Request, @Query('lang') lang?: unknown) {
    return this.render('support', request, lang);
  }

  // Explicit choice, then the browser's languages, then English.
  private render(page: LegalPage, request: Request, lang: unknown) {
    const language =
      LEGAL_LANGUAGES.find((code) => code === lang) ??
      ((request.acceptsLanguages('en', 'it', 'es') || 'en') as LegalLanguage);
    return renderLegalPage(page, language, getLegalIdentity());
  }
}
