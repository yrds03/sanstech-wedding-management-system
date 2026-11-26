import {isDriveConfigured} from '@/lib/drive/config';
import {repositoryRpc} from '@/lib/db/rpc';
import {updatePlatformPricingAndRetention} from './index';
import {z} from 'zod';

export const pricingSchema=z.object({proPriceIdr:z.number().int().min(0).max(2_000_000_000),proPlusPriceIdr:z.number().int().min(0).max(2_000_000_000),gracePeriodDaysAfterEvent:z.number().int().min(1).max(365),addOnsPrices:z.record(z.string(),z.number().int().min(0).max(2_000_000_000)).default({})});
export async function loadPlatformPricing(options?:{allowFallback?:boolean}) {
  if(!isDriveConfigured()) return;
  let data:unknown;
  try {data=await repositoryRpc('getPricingSettings',[]);}
  catch {if(options?.allowFallback)return false;throw new Error('Katalog paket belum dapat dimuat.');}
  const settings=pricingSchema.safeParse(data);
  if(!settings.success){if(options?.allowFallback)return false;throw new Error('Konfigurasi katalog paket perlu diperiksa pengelola.');}
  updatePlatformPricingAndRetention(settings.data);
  return true;
}
export async function savePlatformPricing(input:unknown) {
  const settings=pricingSchema.parse(input);
  if(!isDriveConfigured()){updatePlatformPricingAndRetention(settings);return;}
  await repositoryRpc('updatePricingSettings',[settings]);
  updatePlatformPricingAndRetention(settings);
}
