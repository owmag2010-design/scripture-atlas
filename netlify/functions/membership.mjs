import {reply} from '../lib/guard.mjs';
import {TRIAL_DAYS,TOOL_PLANS} from '../../public/js/membership.js';
export default async req=>req.method==='GET'?reply({bible:'free',trialDays:TRIAL_DAYS,cardRequired:false,billingEnabled:false,signupEnabled:false,plans:Object.keys(TOOL_PLANS)}):reply({error:'Membership signup is not open yet. Bible reading remains free.'},503);
export const config={path:'/api/membership'};
