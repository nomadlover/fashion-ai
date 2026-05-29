export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const outfitId = searchParams.get('outfitId');

  if (!outfitId) return NextResponse.json({ error: 'Missing outfitId' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('outfit_pieces')
    .select('*')
    .eq('outfit_id', outfitId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pieces: data || [] });
}