import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export type CatRow = { id: string; name: string; slug: string; parent_id: string | null };

/** Fetch direct children of a parent (or top-level if parentId is null). */
export function useCategoryChildren(parentId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["category-children", parentId ?? "root"],
    queryFn: async (): Promise<CatRow[]> => {
      let q = supabase.from("categories").select("id, name, slug, parent_id").order("name").limit(2000);
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CatRow[];
    },
    enabled: enabled && parentId !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

/** Resolve the ancestor chain root→leaf for a given category id. */
export function useCategoryAncestors(categoryId: string | null | undefined) {
  return useQuery({
    queryKey: ["category-ancestors", categoryId],
    queryFn: async (): Promise<CatRow[]> => {
      if (!categoryId) return [];
      const { data, error } = await supabase.rpc("get_category_ancestors", { _category_id: categoryId });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ id: r.id, name: r.name, slug: r.slug, parent_id: r.parent_id }));
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}

interface CategoryPickerProps {
  value: string;                            // selected leaf id (deepest pick)
  onChange: (categoryId: string) => void;
  initialPath?: CatRow[];                   // ancestor chain root→leaf to pre-populate (edit mode)
  excludeId?: string;                        // hide this id and its descendants (for parent pickers)
  showBreadcrumb?: boolean;
  required?: boolean;
}

/**
 * Variable-depth cascading category picker. Lazily loads children per level,
 * so it scales to thousands of categories without hitting PostgREST row caps.
 */
export const CategoryPicker = ({
  value,
  onChange,
  initialPath,
  excludeId,
  showBreadcrumb = true,
  required,
}: CategoryPickerProps) => {
  // path = array of selected ids root→leaf. Last entry is the current selection.
  const [path, setPath] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed from initialPath once it arrives.
  useEffect(() => {
    if (seeded) return;
    if (initialPath && initialPath.length > 0) {
      setPath(initialPath.map((c) => c.id));
      setSeeded(true);
    } else if (value && (!initialPath || initialPath.length === 0)) {
      // wait — initialPath may still be loading
    } else if (!value) {
      setSeeded(true);
    }
  }, [initialPath, value, seeded]);

  // Sync external value clearing
  useEffect(() => {
    if (!value && path.length > 0) setPath([]);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLevel = (level: number, id: string) => {
    const next = path.slice(0, level);
    if (id) next.push(id);
    setPath(next);
    onChange(id || (next[next.length - 1] ?? ""));
  };

  // Determine how many select rows to render: one per existing pick + next-level if children exist.
  const parentsForLevels: (string | null)[] = useMemo(() => {
    const arr: (string | null)[] = [null];
    for (const id of path) arr.push(id);
    return arr;
  }, [path]);

  return (
    <div className="space-y-3">
      {showBreadcrumb && <BreadcrumbPath path={path} />}
      {parentsForLevels.map((parentId, idx) => (
        <CategoryLevelSelect
          key={`${idx}-${parentId ?? "root"}`}
          level={idx}
          parentId={parentId}
          selected={path[idx] ?? ""}
          onSelect={(id) => setLevel(idx, id)}
          excludeId={excludeId}
          required={required && idx === 0}
        />
      ))}
    </div>
  );
};

const LEVEL_LABELS = ["Main Category", "Sub-category", "Sub-sub-category", "Level 4", "Level 5", "Level 6"];

function CategoryLevelSelect({
  level,
  parentId,
  selected,
  onSelect,
  excludeId,
  required,
}: {
  level: number;
  parentId: string | null;
  selected: string;
  onSelect: (id: string) => void;
  excludeId?: string;
  required?: boolean;
}) {
  const { data: children = [], isLoading } = useCategoryChildren(parentId);
  const filtered = excludeId ? children.filter((c) => c.id !== excludeId) : children;

  // Don't render the "next level" select if no children exist.
  if (!isLoading && filtered.length === 0 && !selected) return null;

  return (
    <div>
      <Label>{LEVEL_LABELS[level] ?? `Level ${level + 1}`}{required ? " *" : ""}</Label>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading…" : `Select ${LEVEL_LABELS[level] ?? "category"}`} />
        </SelectTrigger>
        <SelectContent>
          {filtered.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BreadcrumbPath({ path }: { path: string[] }) {
  // We need names — fetch ancestors of the leaf for the breadcrumb.
  const leaf = path[path.length - 1] ?? null;
  const { data: ancestors = [] } = useCategoryAncestors(leaf);
  if (!ancestors.length) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ancestors.map((c, i) => (
        <span key={c.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          <Badge variant="secondary" className="text-xs">{c.name}</Badge>
        </span>
      ))}
    </div>
  );
}
