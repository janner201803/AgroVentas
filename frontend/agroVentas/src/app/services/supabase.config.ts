import {createClient} from '@supabase/supabase-js';

import { supabaseConfig } from '../../enviroments/enviroment';

const supabaseUrl = 'https://xasvqusnxxdkfrbvmeni.supabase.co';
const supabaseKey = 'sb_publishable_1-U83eoIO40eYvLGypfOcQ_BMU2udqF';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
