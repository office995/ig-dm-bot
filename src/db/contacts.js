const { supabase } = require('./supabase');

async function dbGetOrCreateContact(instagramId, username) {
  if (!supabase) return null;

  try {
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('instagram_id', instagramId)
      .single();

    if (existing) {
      const updates = {
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (username && username !== existing.instagram_username) {
        updates.instagram_username = username;
      }

      await supabase
        .from('contacts')
        .update(updates)
        .eq('id', existing.id);

      return { ...existing, ...updates };
    }

    const { data: created, error } = await supabase
      .from('contacts')
      .insert({
        instagram_id: instagramId,
        instagram_username: username,
        classification: 'unknown',
      })
      .select()
      .single();

    if (error) throw error;
    return created;
  } catch (err) {
    console.error('[DB] contact error:', err.message);
    return null;
  }
}

async function dbUpdateContactClassification(instagramId, classification) {
  if (!supabase) return;

  const classMap = {
    BUYER: 'course_lead',
    MODEL: 'model_prospect',
    PERSONAL: 'friend',
    UNCLEAR: 'unknown',
  };

  const dbClass = classMap[classification] || 'unknown';

  try {
    await supabase
      .from('contacts')
      .update({
        classification: dbClass,
        updated_at: new Date().toISOString(),
      })
      .eq('instagram_id', instagramId);
  } catch (err) {
    console.error('[DB] classification update error:', err.message);
  }
}

async function dbFlagContact(instagramId, flagged) {
  if (!supabase) return;

  try {
    await supabase
      .from('contacts')
      .update({
        is_flagged_for_eric: flagged,
        updated_at: new Date().toISOString(),
      })
      .eq('instagram_id', instagramId);
  } catch (err) {
    console.error('[DB] flag contact error:', err.message);
  }
}

module.exports = {
  dbGetOrCreateContact,
  dbUpdateContactClassification,
  dbFlagContact,
};