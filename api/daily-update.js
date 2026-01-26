import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // ⚠️ ชั่วคราว hardcode project (เพื่อพิสูจน์ flow)
  const projectName = 'MyNews';

  const { data: project, error } = await supabase
    .from('projects')
    .select('id')
    .eq('project_name', projectName)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Project not found' });
  }

  await supabase.from('project_daily_updates').insert({
    project_id: project.id,
    status_today: 'at_risk',
    progress_note: text,
    blocker_today: null
  });

  return res.status(200).json({ success: true });
}
