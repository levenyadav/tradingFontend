export type CountryInfo = { name: string; iso: string; dial: string };

export const countries: CountryInfo[] = [
  { name: 'India', iso: 'IN', dial: '91' },
  { name: 'United Arab Emirates', iso: 'AE', dial: '971' },
  { name: 'United States', iso: 'US', dial: '1' },
  { name: 'United Kingdom', iso: 'GB', dial: '44' },
  { name: 'Singapore', iso: 'SG', dial: '65' },
  { name: 'Australia', iso: 'AU', dial: '61' },
  { name: 'Canada', iso: 'CA', dial: '1' },
  { name: 'Germany', iso: 'DE', dial: '49' },
  { name: 'France', iso: 'FR', dial: '33' },
  { name: 'Spain', iso: 'ES', dial: '34' },
  { name: 'Italy', iso: 'IT', dial: '39' },
  { name: 'Japan', iso: 'JP', dial: '81' },
  { name: 'China', iso: 'CN', dial: '86' },
  { name: 'Brazil', iso: 'BR', dial: '55' },
  { name: 'Mexico', iso: 'MX', dial: '52' },
  { name: 'Nigeria', iso: 'NG', dial: '234' },
  { name: 'South Africa', iso: 'ZA', dial: '27' },
  { name: 'Saudi Arabia', iso: 'SA', dial: '966' },
  { name: 'Pakistan', iso: 'PK', dial: '92' },
  { name: 'Bangladesh', iso: 'BD', dial: '880' },
  { name: 'Sri Lanka', iso: 'LK', dial: '94' },
  { name: 'Nepal', iso: 'NP', dial: '977' },
  { name: 'Bahrain', iso: 'BH', dial: '973' },
  { name: 'Qatar', iso: 'QA', dial: '974' },
  { name: 'Oman', iso: 'OM', dial: '968' },
  { name: 'Kuwait', iso: 'KW', dial: '965' },
  { name: 'Turkey', iso: 'TR', dial: '90' },
  { name: 'Indonesia', iso: 'ID', dial: '62' },
  { name: 'Philippines', iso: 'PH', dial: '63' },
  { name: 'Kenya', iso: 'KE', dial: '254' },
];

export function isoToFlagClass(iso: string) {
  return `fi fi-${iso.toLowerCase()}`;
}

export function findCountryByIso(iso?: string): CountryInfo | undefined {
  if (!iso) return undefined;
  const t = iso.trim().toUpperCase();
  return countries.find(c => c.iso === t);
}

export function findCountryByDial(dial?: string): CountryInfo | undefined {
  if (!dial) return undefined;
  const t = dial.replace(/[^0-9]/g, '');
  return countries.find(c => c.dial === t);
}