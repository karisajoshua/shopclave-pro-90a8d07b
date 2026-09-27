import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function CategorySelector({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["seller-top-categories"],
    queryFn: async () => { const { data, error } = await supabase.from("categories").select("id,name").is("parent_id", null).order("name").limit(200); if (error) throw error; return data ?? []; },
    staleTime: 300000,
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading product categories…</p>;
  return <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
    {data.map(category => <label key={category.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/60">
      <Checkbox checked={value.includes(category.id)} onCheckedChange={checked => onChange(checked ? [...value, category.id] : value.filter(id => id !== category.id))} />
      <Label className="cursor-pointer font-normal">{category.name}</Label>
    </label>)}
  </div>;
}
