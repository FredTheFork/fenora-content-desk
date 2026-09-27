import DeskView from '@/components/DeskView';
import TopBar from '@/components/TopBar';
import { buildDeskView, loadState } from '@/lib/desk';

export const dynamic = 'force-dynamic';

export default async function DeskPage() {
  const state = await loadState();
  const data = buildDeskView(state);

  return (
    <>
      <TopBar current="desk" />
      <main className="shell" id="main">
        <DeskView data={data} />
      </main>
    </>
  );
}
