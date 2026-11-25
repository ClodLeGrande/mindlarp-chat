import type { Metadata } from 'next';

import { DataControls } from '@/components/settings/data-controls';

export const metadata: Metadata = { title: 'Data & export' };

export default function DataSettingsPage() {
  return <DataControls />;
}
