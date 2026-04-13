import { useState, type FormEvent } from 'react';
import type { MediaRecord } from '../lib/apiClient';

type MediaUploadPanelProps = {
  photos: number;
  videos: number;
  requiredVideos: number;
  mediaFiles: MediaRecord[];
  disabled?: boolean;
  onAddMedia: (input: { kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; fileName: string; mimeType?: string }) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
};

export function MediaUploadPanel({
  photos,
  videos,
  requiredVideos,
  mediaFiles,
  disabled = false,
  onAddMedia,
  onDeleteMedia,
}: MediaUploadPanelProps) {
  const [kind, setKind] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT'>('IMAGE');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const missingVideos = Math.max(requiredVideos - videos, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onAddMedia({
        kind,
        fileName: fileName.trim(),
        mimeType: kind === 'VIDEO' ? 'video/mp4' : kind === 'IMAGE' ? 'image/jpeg' : 'application/octet-stream',
      });
      setFileName('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to add media');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(mediaId: string) {
    setBusy(true);
    setError(null);

    try {
      await onDeleteMedia(mediaId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete media');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <p className="eyebrow">Media upload</p>
          <h3>Proof of packing and testing</h3>
        </div>
      </div>

      <div className="media-stats">
        <div>
          <span className="meta-label">Photos</span>
          <strong aria-label="Photos count">{photos}</strong>
        </div>
        <div>
          <span className="meta-label">Videos</span>
          <strong aria-label="Videos count">{videos}</strong>
        </div>
        <div>
          <span className="meta-label">Still required</span>
          <strong aria-label="Videos still required">{missingVideos}</strong>
        </div>
      </div>

      <form className="media-form" onSubmit={handleSubmit}>
        <label>
          <span className="meta-label">Media type</span>
          <select aria-label="Media type" value={kind} onChange={(event) => setKind(event.target.value as 'IMAGE' | 'VIDEO' | 'DOCUMENT')} disabled={disabled || busy}>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="DOCUMENT">Document</option>
          </select>
        </label>
        <label>
          <span className="meta-label">File name</span>
          <input aria-label="File name" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="packing-proof.jpg" disabled={disabled || busy} />
        </label>
        <button className="ghost-button" type="submit" disabled={disabled || busy}>
          {busy ? 'Saving…' : 'Add media record'}
        </button>
      </form>

      {error ? <p className="muted-copy" role="alert">{error}</p> : null}

      <div className="media-list">
        {mediaFiles.length === 0 ? (
          <p className="muted-copy">No media records yet.</p>
        ) : (
          mediaFiles.map((file) => (
            <div className="check-row" key={file.id}>
              <div>
                <span>{file.fileName}</span>
                <p className="muted-copy">{file.kind}</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => void handleDelete(file.id)} disabled={disabled || busy} aria-label={`Remove ${file.fileName}`}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <p className="muted-copy">
        Minimum rule: multiple photos plus {requiredVideos} testing video{requiredVideos > 1 ? 's' : ''} before dispatch.
      </p>
    </section>
  );
}
