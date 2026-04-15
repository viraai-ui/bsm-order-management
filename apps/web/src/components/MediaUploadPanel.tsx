import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { MediaRecord } from '../lib/apiClient';

type MediaKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

type MediaUploadPanelProps = {
  photos: number;
  videos: number;
  requiredVideos: number;
  mediaFiles: MediaRecord[];
  disabled?: boolean;
  onAddMedia: (input: { kind: MediaKind; file: File }) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
};

const FILE_ACCEPT = 'image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,application/pdf';

function inferKind(file: File): MediaKind {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

export function MediaUploadPanel({
  photos,
  videos,
  requiredVideos,
  mediaFiles,
  disabled = false,
  onAddMedia,
  onDeleteMedia,
}: MediaUploadPanelProps) {
  const [kind, setKind] = useState<MediaKind>('IMAGE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const missingVideos = Math.max(requiredVideos - videos, 0);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setKind(inferKind(file));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError('Choose a file before uploading');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onAddMedia({ kind, file: selectedFile });
      setSelectedFile(null);
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload media');
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
        <div className="media-form-grid">
          <label>
            <span className="meta-label">Media type</span>
            <select aria-label="Media type" value={kind} onChange={(event) => setKind(event.target.value as MediaKind)} disabled={disabled || busy}>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </label>
          <label>
            <span className="meta-label">Choose file</span>
            <input aria-label="Choose file" type="file" accept={FILE_ACCEPT} onChange={handleFileChange} disabled={disabled || busy} />
          </label>
        </div>
        <div className="upload-actions">
          <p className="muted-copy upload-file-name">{selectedFile ? selectedFile.name : 'No file selected yet.'}</p>
          <button className="ghost-button" type="submit" disabled={disabled || busy}>
            {busy ? 'Uploading…' : 'Upload media'}
          </button>
        </div>
      </form>

      {error ? <p className="muted-copy" role="alert">{error}</p> : null}

      <div className="media-list">
        {mediaFiles.length === 0 ? (
          <p className="muted-copy">No uploaded proof yet.</p>
        ) : (
          mediaFiles.map((file) => (
            <div className="check-row" key={file.id}>
              <div>
                <span>{file.fileName}</span>
                <p className="muted-copy">{file.kind}{file.mimeType ? ` • ${file.mimeType}` : ''}</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => void handleDelete(file.id)} disabled={disabled || busy} aria-label={`Remove ${file.fileName}`}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <p className="muted-copy">
        Minimum rule: at least one photo plus {requiredVideos} testing video{requiredVideos > 1 ? 's' : ''} before dispatch can complete.
      </p>
    </section>
  );
}
