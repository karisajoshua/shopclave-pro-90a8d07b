import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, FileText, Loader2, Search, BookOpen } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const MD_URL = "/docs/Barakaz-Admin-Manual.md";
const PDF_URL = "/docs/Barakaz-Admin-Manual.pdf";
const DOCX_URL = "/docs/Barakaz-Admin-Manual.docx";

type Heading = { level: number; text: string; id: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const AdminDocumentation = () => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(MD_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load manual (${r.status})`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const headings = useMemo<Heading[]>(() => {
    if (!content) return [];
    const lines = content.split("\n");
    const result: Heading[] = [];
    let inFence = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) {
        const level = m[1].length;
        const text = m[2].trim();
        result.push({ level, text, id: slugify(text) });
      }
    }
    return result;
  }, [content]);

  const filteredContent = useMemo(() => {
    if (!query.trim()) return content;
    const sections = content.split(/^(?=##\s)/m);
    const q = query.toLowerCase();
    return sections.filter((s) => s.toLowerCase().includes(q)).join("\n");
  }, [content, query]);

  useEffect(() => {
    if (!content) return;
    const container = document.getElementById("doc-scroll");
    if (!container) return;
    const onScroll = () => {
      const els = headings
        .map((h) => document.getElementById(h.id))
        .filter((el): el is HTMLElement => !!el);
      const top = container.getBoundingClientRect().top;
      let current = "";
      for (const el of els) {
        if (el.getBoundingClientRect().top - top <= 80) current = el.id;
        else break;
      }
      if (current) setActiveId(current);
    };
    container.addEventListener("scroll", onScroll);
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [headings, content, filteredContent]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById("doc-scroll");
    if (el && container) {
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16;
      container.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Documentation"
        subtitle="Full admin and technical manual for the Barakaz platform"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={PDF_URL} download>
                <Download className="h-4 w-4 mr-1.5" /> PDF
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={DOCX_URL} download>
                <Download className="h-4 w-4 mr-1.5" /> DOCX
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={MD_URL} download>
                <Download className="h-4 w-4 mr-1.5" /> Markdown
              </a>
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
          <aside className="border-r bg-muted/30 hidden lg:flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search manual..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <nav className="p-2 space-y-0.5">
                {headings.length === 0 && !loading && (
                  <p className="text-xs text-muted-foreground p-2">No sections found.</p>
                )}
                {headings.map((h, i) => (
                  <button
                    key={`${h.id}-${i}`}
                    onClick={() => scrollTo(h.id)}
                    className={cn(
                      "w-full text-left text-xs py-1.5 px-2 rounded hover:bg-accent transition-colors block truncate",
                      h.level === 1 && "font-semibold",
                      h.level === 2 && "pl-3",
                      h.level === 3 && "pl-6 text-muted-foreground",
                      activeId === h.id && "bg-accent text-accent-foreground font-medium",
                    )}
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </aside>

          <div id="doc-scroll" className="overflow-auto">
            {loading && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading manual...
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Couldn't load the manual</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            )}
            {!loading && !error && (
              <>
                <div className="lg:hidden p-3 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search manual..."
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <article className="prose prose-sm md:prose-base max-w-none p-6 md:p-8 prose-headings:scroll-mt-4 prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none prose-a:text-primary">
                  {filteredContent.trim() === "" ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="font-medium">No matches for "{query}"</p>
                      <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children, ...props }) => {
                          const text = String(children);
                          return <h1 id={slugify(text)} {...props}>{children}</h1>;
                        },
                        h2: ({ children, ...props }) => {
                          const text = String(children);
                          return <h2 id={slugify(text)} {...props}>{children}</h2>;
                        },
                        h3: ({ children, ...props }) => {
                          const text = String(children);
                          return <h3 id={slugify(text)} {...props}>{children}</h3>;
                        },
                      }}
                    >
                      {filteredContent}
                    </ReactMarkdown>
                  )}
                </article>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDocumentation;
