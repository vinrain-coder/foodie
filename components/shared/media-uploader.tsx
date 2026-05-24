"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";
import {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
  Controller,
} from "react-hook-form";

import { Card, CardContent } from "@/components/ui/card";
import { X, Play, AlertCircle } from "lucide-react";
import {
  dedupeMediaUrls,
  getMediaTypeFromUrl,
  getUploadthingFileUrl,
  isSafeMediaUrl,
} from "@/lib/uploadthing-media";

type MediaType = "image" | "video";
type MediaItem = { url: string; type: MediaType };

const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;

const IMAGE_ONLY_ACCEPT = {
  "image/*": [],
} as const;

const IMAGE_AND_VIDEO_ACCEPT = {
  "image/*": [],
  "video/*": [],
} as const;

const areMediaListsEqual = (a: MediaItem[], b: MediaItem[]) => {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index]?.url !== b[index]?.url || a[index]?.type !== b[index]?.type) {
      return false;
    }
  }
  return true;
};

const areStringListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

function MediaPreview({
  item,
  onRemove,
}: {
  item: MediaItem;
  onRemove: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const [useDirectImage, setUseDirectImage] = useState(false);

  if (!isSafeMediaUrl(item.url) || broken) {
    return (
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
        <AlertCircle className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      {item.type === "image" ? (
        useDirectImage ? (
          // Fallback for hosts/URLs where next/image optimization fails.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt="Uploaded media preview"
            className="h-28 w-28 rounded-lg border object-cover"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <Image
            src={item.url}
            alt="Uploaded media preview"
            width={120}
            height={120}
            className="h-28 w-28 rounded-lg border object-cover"
            onError={() => setUseDirectImage(true)}
          />
        )
      ) : (
        <div className="relative h-28 w-28 overflow-hidden rounded-lg border bg-black/10">
          <video
            src={item.url}
            className="h-full w-full object-cover"
            muted
            preload="metadata"
            onError={() => setBroken(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play size={32} className="text-white/80" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white shadow hover:bg-black"
      >
        <X size={14} />
      </button>
    </div>
  );
}

type MediaUploaderProps<TFieldValues extends FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  uploadRoute:
    | "menuItems"
    | "categories"
    | "tags"
    | "logos"
    | "reviews"
    | "blogs"
    | "pages"
    | "carousels"
    | "restaurants"
    | "riderProofs";
  multiple?: boolean;
  maxFiles?: number;
};

export default function MediaUploader<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  uploadRoute,
  multiple = false,
  maxFiles = multiple ? 6 : 1,
}: MediaUploaderProps<TFieldValues>) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [pasteEnabled, setPasteEnabled] = useState(false);

  const acceptsVideo = uploadRoute === "menuItems";
  const acceptedTypes = acceptsVideo ? IMAGE_AND_VIDEO_ACCEPT : IMAGE_ONLY_ACCEPT;

  const value = form.watch(name) as unknown;

  const normalizedFromForm = useMemo(() => {
    const urls = Array.isArray(value) ? value : [value];
    return dedupeMediaUrls(
      urls
        .map((entry) => (typeof entry === "string" ? entry : ""))
        .filter((entry) => isSafeMediaUrl(entry)),
    ).map((url) => ({ url, type: getMediaTypeFromUrl(url) }));
  }, [value]);

  useEffect(() => {
    setMedia((previous) =>
      areMediaListsEqual(previous, normalizedFromForm)
        ? previous
        : normalizedFromForm,
    );
  }, [normalizedFromForm]);

  useEffect(() => {
    const nextValue = multiple
      ? media.map((item) => item.url)
      : media[0]?.url || "";

    if (multiple) {
      const currentValue = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
      const nextArray = nextValue as string[];
      if (areStringListsEqual(currentValue, nextArray)) return;
    } else {
      const currentValue = typeof value === "string" ? value : "";
      if (currentValue === nextValue) return;
    }

    form.setValue(
      name,
      nextValue as PathValue<TFieldValues, Path<TFieldValues>>,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }, [form, media, multiple, name, value]);

  const { startUpload, isUploading } = useUploadThing(uploadRoute, {
    onClientUploadComplete: (result) => {
      const uploadedUrls = (result || [])
        .map((file) => getUploadthingFileUrl(file))
        .filter((url) => isSafeMediaUrl(url));

      if (uploadedUrls.length === 0) {
        toast.error("Upload completed but no file URL was returned.");
        setProgress(0);
        return;
      }

      setMedia((previous) => {
        const next = multiple
          ? [...previous.map((item) => item.url), ...uploadedUrls]
          : [uploadedUrls[uploadedUrls.length - 1]];
        return dedupeMediaUrls(next)
          .slice(0, maxFiles)
          .map((url) => ({ url, type: getMediaTypeFromUrl(url) }));
      });

      setProgress(0);
      toast.success("Upload completed");
    },
    onUploadProgress: setProgress,
    onUploadError: (error) => {
      setProgress(0);
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple,
    maxFiles,
    maxSize: MAX_UPLOAD_SIZE_BYTES,
    accept: acceptedTypes,
    disabled: isUploading,
    onDrop: async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      const result = await startUpload(acceptedFiles);
      if (!result) {
        toast.error("Upload did not start. Please retry.");
      }
    },
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];
      if (firstError?.code === "file-too-large") {
        toast.error("File is too large. Max size is 4MB.");
        return;
      }
      if (firstError?.code === "file-invalid-type") {
        toast.error(
          acceptsVideo
            ? "Invalid file type. Use an image or video file."
            : "Invalid file type. Use an image file.",
        );
        return;
      }
      toast.error(firstError?.message || "Some files were rejected.");
    },
  });

  const handleRemove = async (url: string) => {
    try {
      const response = await fetch("/api/delete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to delete file");
      }

      setMedia((previous) => previous.filter((item) => item.url !== url));
      toast.success("File deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete uploaded file");
    }
  };

  useEffect(() => {
    if (isUploading) return;

    const handlePaste = (event: ClipboardEvent) => {
      if (!pasteEnabled) return;

      const items = Array.from(event.clipboardData?.items || []);
      const files: File[] = [];

      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          toast.error("Pasted image is too large. Max size is 4MB.");
          return;
        }
        files.push(
          new File([file], `pasted-${Date.now()}-${files.length}.png`, {
            type: file.type,
          }),
        );
      }

      if (files.length) {
        void startUpload(files);
        toast.success("Pasted image uploading...");
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isUploading, pasteEnabled, startUpload]);

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>

          <Card>
            <CardContent className="space-y-4 pt-4">
              {media.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {media.map((item) => (
                    <MediaPreview
                      key={item.url}
                      item={item}
                      onRemove={() => handleRemove(item.url)}
                    />
                  ))}
                </div>
              ) : null}

              <div
                {...getRootProps({
                  tabIndex: 0,
                  onFocus: () => setPasteEnabled(true),
                  onBlur: () => setPasteEnabled(false),
                  onMouseEnter: () => setPasteEnabled(true),
                  onMouseLeave: () => setPasteEnabled(false),
                })}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
                  isUploading
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer"
                } ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/30 bg-muted"
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-xs text-muted-foreground">
                  Drag and drop, click to upload, or paste image (Ctrl+V)
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Supported:{" "}
                  {acceptsVideo ? "images/videos" : "images"} up to 4MB
                </p>
              </div>

              {isUploading ? (
                <div>
                  <div className="h-3 rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-sm">{progress}%</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
