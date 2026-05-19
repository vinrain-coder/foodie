"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getAllTagsForAdminMenuItemCreate } from "@/lib/actions/tag.actions";

interface TagsInputProps {
  field: {
    value: string[];
    onChange: (val: string[]) => void;
  };
  error?: { message?: string };
}

export default function TagsInput({ field, error }: TagsInputProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch Tags ---------------- */
  useEffect(() => {
    let mounted = true;

    async function fetchTags() {
      try {
        const tags = await getAllTagsForAdminMenuItemCreate();

        if (!mounted) return;

        setAvailableTags(tags.filter((t): t is string => Boolean(t?.trim())));
      } catch (error) {
        console.error("Failed to fetch tags:", error);
        setAvailableTags([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTags();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Helpers ---------------- */
  const currentTags = Array.isArray(field.value) ? field.value : [];

  const toggleTag = (tag: string) => {
    field.onChange(
      currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag],
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel className="text-sm font-medium">Tags</FieldLabel>

      <div className="flex flex-wrap gap-2">
        {loading && (
          <span className="text-sm text-muted-foreground">Loading tags…</span>
        )}

        {!loading && availableTags.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No tags available
          </span>
        )}

        {availableTags.map((tag) => {
          const selected = currentTags.includes(tag);

          return (
            <Button
              key={tag}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              onClick={() => toggleTag(tag)}
              className="rounded-full px-4"
            >
              {tag}
            </Button>
          );
        })}
      </div>

      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}
