const { supabase } = require('./supabase');

async function dbGetOrCreateConversation(contactDbId) {
  if (!supabase) return null;

  try {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contactDbId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ contact_id: contactDbId, status: 'active' })
      .select()
      .single();

    if (error) throw error;
    return created;
  } catch (err) {
    if (err.code === 'PGRST116') {
      const { data: created, error: createErr } = await supabase
        .from('conversations')
        .insert({ contact_id: contactDbId, status: 'active' })
        .select()
        .single();

      if (createErr) {
        console.error('[DB] create conversation error:', createErr.message);
        return null;
      }

      return created;
    }

    console.error('[DB] conversation error:', err.message);
    return null;
  }
}

async function dbMarkLinkSent(conversationId) {
  if (!supabase) return;

  try {
    await supabase
      .from('conversations')
      .update({ has_sent_link: true })
      .eq('id', conversationId);
  } catch (err) {
    console.error('[DB] mark link sent error:', err.message);
  }
}

async function dbUpdateConversationStatus(conversationId, status) {
  if (!supabase) return;

  try {
    await supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversationId);
  } catch (err) {
    console.error('[DB] update conversation status error:', err.message);
  }
}

module.exports = {
  dbGetOrCreateConversation,
  dbMarkLinkSent,
  dbUpdateConversationStatus,
};