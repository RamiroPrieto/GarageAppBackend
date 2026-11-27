import type { LegalIdentity } from './legal.types';

const read = (key: string) => process.env[key]?.trim() || undefined;

export function getLegalIdentity(): LegalIdentity {
  return {
    name: read('LEGAL_NAME') ?? 'Franco Armanasco',
    address:
      read('LEGAL_ADDRESS') ?? 'Via Giacinto Collegno 20, 10143 Torino, Italia',
    vat: read('LEGAL_VAT'),
    email: read('LEGAL_EMAIL') ?? 'contacto@garageapp.cc',
    euRepresentative: read('LEGAL_EU_REPRESENTATIVE'),
  };
}
