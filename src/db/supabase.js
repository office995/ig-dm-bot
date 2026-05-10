const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
} = require('../config/env');

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

module.exports = {
  supabase,
};