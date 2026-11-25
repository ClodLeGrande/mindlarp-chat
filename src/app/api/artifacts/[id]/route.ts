import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const preview = url.searchParams.get('preview') === '1';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: artifact } = await supabase
    .schema('chat')
    .from('artifacts')
    .select('storage_path, title, mime_type')
    .eq('id', id)
    .maybeSingle();

  if (!artifact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase.storage
    .from('chat-artifacts')
    .createSignedUrl(artifact.storage_path, 3600, {
      download: preview ? false : `${artifact.title.replace(/[^\w.\- ]+/g, '_')}`,
    });

  if (error || !data) {
    return NextResponse.json({ error: 'Could not sign the download.' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
