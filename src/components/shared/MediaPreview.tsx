import { useState } from "react";
import type { Item, ArchiveFile } from "../../lib/types";

interface MediaPreviewProps {
  item: Item;
}

export function MediaPreview({ item }: MediaPreviewProps) {
  const [imgError, setImgError] = useState(false);

  // Parse metadata for file info
  const metadata = item.metadata_json ? JSON.parse(item.metadata_json) : null;
  const files: ArchiveFile[] = metadata?.files || [];

  switch (item.media_type) {
    case "image":
      return <ImagePreview item={item} imgError={imgError} setImgError={setImgError} />;
    case "audio":
      return <AudioPreview item={item} files={files} />;
    case "movies":
      return <VideoPreview item={item} files={files} />;
    case "texts":
      return <TextPreview item={item} />;
    default:
      return <ThumbnailPreview item={item} imgError={imgError} setImgError={setImgError} />;
  }
}

function ImagePreview({
  item,
  imgError,
  setImgError,
}: {
  item: Item;
  imgError: boolean;
  setImgError: (v: boolean) => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  // Try to find original image file
  const metadata = item.metadata_json ? JSON.parse(item.metadata_json) : null;
  const files: ArchiveFile[] = metadata?.files || [];
  const imageFile = files.find(
    (f) =>
      f.source === "original" &&
      f.name &&
      /\.(jpg|jpeg|png|gif|tif|tiff)$/i.test(f.name)
  );

  const src = imageFile
    ? `https://archive.org/download/${item.id}/${imageFile.name}`
    : item.thumbnail_url;

  if (imgError || !src) {
    return <FallbackThumbnail />;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          background: "var(--bg-tertiary)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          cursor: "zoom-in",
          maxHeight: 420,
        }}
        onClick={() => setZoomed(true)}
      >
        <img
          src={src}
          alt={item.title}
          style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }}
          onError={() => setImgError(true)}
        />
      </div>
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
          }}
        >
          <img
            src={src}
            alt={item.title}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
          />
        </div>
      )}
    </>
  );
}

function AudioPreview({ item, files }: { item: Item; files: ArchiveFile[] }) {
  // Find playable audio files
  const audioFiles = files.filter(
    (f) => f.name && /\.(mp3|ogg|flac|wav)$/i.test(f.name)
  );

  const playable = audioFiles.length > 0 ? audioFiles : [];

  return (
    <div
      style={{
        background: "var(--bg-tertiary)",
        borderRadius: "var(--radius)",
        padding: 20,
      }}
    >
      {item.thumbnail_url && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <img
            src={item.thumbnail_url}
            alt=""
            style={{
              width: 180,
              height: 180,
              objectFit: "cover",
              borderRadius: "var(--radius)",
            }}
          />
        </div>
      )}
      {playable.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {playable.slice(0, 10).map((f, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </div>
              <audio
                controls
                preload="none"
                style={{ width: "100%", height: 36 }}
                src={`https://archive.org/download/${item.id}/${encodeURIComponent(f.name!)}`}
              />
            </div>
          ))}
          {audioFiles.length > 10 && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              +{audioFiles.length - 10} more tracks
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <iframe
            src={`https://archive.org/embed/${item.id}`}
            width="100%"
            height="60"
            frameBorder="0"
            allowFullScreen
            style={{ borderRadius: "var(--radius-sm)" }}
          />
        </div>
      )}
    </div>
  );
}

function VideoPreview({ item, files }: { item: Item; files: ArchiveFile[] }) {
  // Find MP4 file (prefer h.264 derivative)
  const mp4 = files.find(
    (f) => f.name && /\.mp4$/i.test(f.name) && f.source !== "original"
  ) || files.find((f) => f.name && /\.mp4$/i.test(f.name));

  if (mp4?.name) {
    return (
      <div
        style={{
          background: "#000",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        <video
          controls
          preload="metadata"
          style={{ width: "100%", maxHeight: 420 }}
          poster={item.thumbnail_url || undefined}
          src={`https://archive.org/download/${item.id}/${encodeURIComponent(mp4.name)}`}
        />
      </div>
    );
  }

  // Fallback to Archive.org embed
  return (
    <div style={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
      <iframe
        src={`https://archive.org/embed/${item.id}`}
        width="100%"
        height="400"
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
}

function TextPreview({ item }: { item: Item }) {
  return (
    <div style={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
      <iframe
        src={`https://archive.org/details/${item.id}?ui=embed`}
        width="100%"
        height="500"
        frameBorder="0"
        style={{ background: "#fff" }}
      />
    </div>
  );
}

function ThumbnailPreview({
  item,
  imgError,
  setImgError,
}: {
  item: Item;
  imgError: boolean;
  setImgError: (v: boolean) => void;
}) {
  if (imgError || !item.thumbnail_url) {
    return <FallbackThumbnail />;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        background: "var(--bg-tertiary)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        maxHeight: 300,
      }}
    >
      <img
        src={item.thumbnail_url}
        alt={item.title}
        style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function FallbackThumbnail() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 200,
        background: "var(--bg-tertiary)",
        borderRadius: "var(--radius)",
        color: "var(--text-muted)",
        fontSize: "0.87rem",
      }}
    >
      No Preview Available
    </div>
  );
}
