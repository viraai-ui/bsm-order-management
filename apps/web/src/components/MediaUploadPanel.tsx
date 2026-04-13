type MediaUploadPanelProps = {
  photos: number;
  videos: number;
  requiredVideos: number;
};

export function MediaUploadPanel({ photos, videos, requiredVideos }: MediaUploadPanelProps) {
  const missingVideos = Math.max(requiredVideos - videos, 0);

  return (
    <section className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <p className="eyebrow">Media upload</p>
          <h3>Proof of packing and testing</h3>
        </div>
        <button className="ghost-button" type="button">Upload files</button>
      </div>

      <div className="media-stats">
        <div>
          <span className="meta-label">Photos</span>
          <strong>{photos}</strong>
        </div>
        <div>
          <span className="meta-label">Videos</span>
          <strong>{videos}</strong>
        </div>
        <div>
          <span className="meta-label">Still required</span>
          <strong>{missingVideos}</strong>
        </div>
      </div>

      <p className="muted-copy">
        Minimum rule: multiple photos plus {requiredVideos} testing video{requiredVideos > 1 ? 's' : ''} before dispatch.
      </p>
    </section>
  );
}
