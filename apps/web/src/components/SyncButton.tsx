type SyncButtonProps = {
  lastSyncedAt: string;
  pendingJobs: number;
};

export function SyncButton({ lastSyncedAt, pendingJobs }: SyncButtonProps) {
  return (
    <button className="primary-button sync-button" type="button">
      <span>Zoho sync</span>
      <small>
        {pendingJobs} pending, last {lastSyncedAt}
      </small>
    </button>
  );
}
