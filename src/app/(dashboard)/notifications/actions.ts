'use server';

import { revalidatePath } from 'next/cache';
import { markNotificationRead } from '@/lib/supabase/queries/notifications';

export async function markReadAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await markNotificationRead(id);
  revalidatePath('/notifications');
}
