import {beforeEach,describe,expect,it,vi} from 'vitest';
const dependencies=vi.hoisted(()=>({user:vi.fn(),save:vi.fn(),activate:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getCurrentUserServer:dependencies.user}));
vi.mock('@/lib/db/repository',()=>({resetAllDataToZero:vi.fn(),updateEventPlanByAdmin:dependencies.activate}));
vi.mock('@/lib/plans/server',async importOriginal=>({...await importOriginal<typeof import('@/lib/plans/server')>(),savePlatformPricing:dependencies.save}));
import {POST} from '@/app/api/admin/pricing/route';
const send=(data:Record<string,string>)=>POST(new Request('https://app.example.com/api/admin/pricing',{method:'POST',headers:{Origin:'https://app.example.com','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)}));
beforeEach(()=>{vi.clearAllMocks();dependencies.user.mockResolvedValue({userId:'owner',isPlatformAdmin:true});});
describe('pricing action validation',()=>{
 it('rejects unknown actions without silently resetting prices',async()=>{
  expect((await send({action:'activate_addon'})).status).toBe(400);expect(dependencies.save).not.toHaveBeenCalled();expect(dependencies.activate).not.toHaveBeenCalled();
 });
 it('rejects invalid event identifiers and plan codes before attempting activation',async()=>{
  expect((await send({action:'activate_event_plan',eventId:'not-an-event',planCode:'pro'})).status).toBe(400);
  expect((await send({action:'activate_event_plan',eventId:'11111111-1111-4111-8111-111111111111',planCode:'unlimited'})).status).toBe(400);
  expect(dependencies.activate).not.toHaveBeenCalled();
 });
 it('rejects price changes by a workspace owner who is not a platform administrator',async()=>{
  dependencies.user.mockResolvedValue({userId:'owner',isPlatformAdmin:false});
  expect((await send({action:'update_pricing',proPriceIdr:'0'})).status).toBe(403);expect(dependencies.save).not.toHaveBeenCalled();
 });
});
