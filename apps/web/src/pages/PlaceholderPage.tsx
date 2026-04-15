import { OperationsLayout } from '../components/OperationsLayout';

export function PlaceholderPage({ section, description }: { section: string; description: string }) {
  return (
    <OperationsLayout>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations board</p>
            <h2>{section}</h2>
          </div>
        </header>

        <section className="detail-panel">
          <p className="eyebrow">Coming soon</p>
          <h3>{section} is not live yet</h3>
          <p className="muted-copy">{description}</p>
        </section>
      </main>
    </OperationsLayout>
  );
}
