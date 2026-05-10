function createDedupHelpers(supabase) {
  async function dbDedup(key) {
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('webhook_dedup').insert({ dedup_key: key });
      if (error && error.code === '23505') return true;
      return false;
    } catch (err) {
      console.error('[DEDUP] Error:', err.message);
      return false;
    }
  }

  function startDedupCleanup() {
    return setInterval(async () => {
      if (!supabase) return;

      try {
        const cutoff = new Date(Date.now() - 120000).toISOString();
        await supabase.from('webhook_dedup').delete().lt('created_at', cutoff);
      } catch (_) {}
    }, 300000);
  }

  return {
    dbDedup,
    startDedupCleanup,
  };
}

module.exports = {
  createDedupHelpers,
};