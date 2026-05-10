const { supabase } = require('./supabase');

async function dbSaveMessage(conversationId, contactDbId, direction, content) {
  if (!supabase) return;

  try {
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        contact_id: contactDbId,
        direction,
        content,
      });

    const now = new Date().toISOString();

    const { data: conv } = await supabase
      .from('conversations')
      .select('message_count')
      .eq('id', conversationId)
      .single();

    await supabase
      .from('conversations')
      .update({
        last_message_at: now,
        message_count: (conv?.message_count || 0) + 1,
      })
      .eq('id', conversationId);
  } catch (err) {
    console.error('[DB] save message error:', err.message);
  }
}

async function dbLoadMessages(contactDbId, limit = 40) {
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from('messages')
      .select('direction, content, created_at')
      .eq('contact_id', contactDbId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!data || data.length === 0) return null;

    return data.map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));
  } catch (err) {
    console.error('[DB] load messages error:', err.message);
    return null;
  }
}

module.exports = {
  dbSaveMessage,
  dbLoadMessages,
};