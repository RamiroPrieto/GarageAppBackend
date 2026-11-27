import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LegalModule } from './legal.module';

describe('LegalController', () => {
  let app: INestApplication;
  const KEYS = [
    'LEGAL_NAME',
    'LEGAL_ADDRESS',
    'LEGAL_VAT',
    'LEGAL_EMAIL',
    'LEGAL_EU_REPRESENTATIVE',
  ];
  const original = KEYS.map((key) => [key, process.env[key]] as const);
  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LegalModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => KEYS.forEach((key) => delete process.env[key]));
  afterAll(async () => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app?.close();
  });

  it.each(['privacy', 'terms', 'delete-account', 'support'])(
    'serves /%s as public HTML in every language',
    async (page) => {
      for (const lang of ['it', 'en', 'es']) {
        const response = await get(`/${page}?lang=${lang}`);
        expect(response.status).toBe(200);
        expect(response.type).toBe('text/html');
        expect(response.text).toContain(`<html lang="${lang}">`);
        expect(response.text).not.toMatch(/undefined|lorem/i);
      }
    },
  );

  it('follows the browser language and falls back to English', async () => {
    const italian = await get('/privacy').set(
      'Accept-Language',
      'it-IT,it;q=0.9',
    );
    expect(italian.text).toContain('<html lang="it">');
    const other = await get('/privacy?lang=xx').set('Accept-Language', 'fr');
    expect(other.text).toContain('<html lang="en">');
    const none = await get('/privacy');
    expect(none.text).toContain('<html lang="en">');
  });

  it('shows the operator details', async () => {
    const { text } = await get('/privacy?lang=es');
    expect(text).toContain('Franco Armanasco');
    expect(text).toContain('Via Giacinto Collegno 20, 10143 Torino, Italia');
    expect(text).not.toContain('<mark>');
  });

  it('lets the environment override the details, escaped', async () => {
    process.env.LEGAL_NAME = 'A <b>& C$&';
    process.env.LEGAL_ADDRESS = 'Via Roma 1, Torino';
    const { text } = await get('/privacy?lang=en');
    expect(text).not.toContain('<mark>');
    expect(text).toContain('A &lt;b&gt;&amp; C$&amp;');
    expect(text).toContain('mailto:contacto@garageapp.cc');
  });
});
