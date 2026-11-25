import {createSupabaseServerClient} from '@/lib/db/supabase-server';
import {isSupabaseConfigured} from '@/lib/db/supabase-browser';
import {updatePlatformPricingAndRetention} from './index';
import {z} from 'zod';

export const pricingSchema=z.object({proPriceIdr:z.number().int().min(0).max(2_000_000_000),proPlusPriceIdr:z.number().int().min(0).max(2_000_000_000),gracePeriodDaysAfterEvent:z.number().int().min(1).max(365),addOnsPrices:z.record(z.string(),z.number().int().min(0).max(2_000_000_000)).optional()});
export async function loadPlatformPricing(options?:{allowFallback?:boolean}) {
  if(!isSupabaseConfigured()) return;
  const db=await createSupabaseServerClient();
  const {data,error}=await db.rpc('wms_repository',{p_action:'getPricingSettings',p_args:[]});
  if(error) {if(options?.allowFallback)return false;throw new Error('Katalog paket belum dapat dimuat.');}
  const settings=pricingSchema.parse(data);
  updatePlatformPricingAndRetention(settings);
  return true;
}
export async function savePlatformPricing(input:unknown) {
  const settings=pricingSchema.parse(input);
  if(!isSupabaseConfigured()){updatePlatformPricingAndRetention(settings);return;}
  const db=await createSupabaseServerClient();
  const {error}=await db.rpc('wms_repository',{p_action:'updatePricingSettings',p_args:[settings]});
  if(error) throw new Error('Pengaturan harga belum dapat disimpan.');
  updatePlatformPricingAndRetention(settings);
}
