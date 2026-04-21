import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Check, X, FileText, Download } from "lucide-react";

interface MessageBubbleProps {
  msg: any;
  isMe: boolean;
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  locked?: boolean;
}

const EDIT_DELETE_WINDOW_MS = 5 * 60 * 1000;

export const MessageBubble = ({ msg, isMe, onDeleteForMe, onDeleteForEveryone, onEdit, locked }: MessageBubbleProps) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(msg.message);

  if (msg.is_system_message) {
    return (
      <div className="flex justify-center">
        <div className="text-[11px] bg-muted/60 text-muted-foreground rounded-full px-3 py-1 max-w-[85%] text-center">
          {msg.message}
        </div>
      </div>
    );
  }

  const isDeleted = !!msg.deleted_at;
  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  const withinWindow = ageMs < EDIT_DELETE_WINDOW_MS;

  const renderAttachment = () => {
    if (!msg.attachment_url || isDeleted) return null;
    if (msg.message_type === "image") {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block">
          <img
            src={msg.attachment_url}
            alt="attachment"
            className="rounded max-h-48 max-w-full object-cover mb-1"
            loading="lazy"
          />
        </a>
      );
    }
    if (msg.message_type === "voice") {
      return <audio controls src={msg.attachment_url} className="max-w-full mb-1" />;
    }
    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-xs underline mb-1"
      >
        <FileText className="h-3 w-3" />
        <span className="truncate max-w-[180px]">Attachment</span>
        <Download className="h-3 w-3" />
      </a>
    );
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm relative ${
        isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }`}>
        {editing ? (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-8 text-foreground bg-background"
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(false); setText(msg.message); }}>
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => { onEdit(msg.id, text.trim()); setEditing(false); }}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {renderAttachment()}
            {msg.message && (
              <p className={isDeleted ? "italic opacity-70" : ""}>{msg.message}</p>
            )}
            <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {msg.edited_at && !isDeleted && <span>· edited</span>}
              {isMe && msg.seen_at && <span>· seen</span>}
            </p>
            {!isDeleted && !locked && (
              <div className={`absolute top-1 ${isMe ? "left-1" : "right-1"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-5 w-5 ${isMe ? "text-primary-foreground hover:bg-primary-foreground/20" : ""}`}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isMe ? "start" : "end"}>
                    <DropdownMenuItem onClick={() => onDeleteForMe(msg.id)}>
                      Delete for me
                    </DropdownMenuItem>
                    {isMe && withinWindow && msg.message_type === "text" && (
                      <DropdownMenuItem onClick={() => setEditing(true)}>
                        <Pencil className="h-3 w-3 mr-2" /> Edit
                      </DropdownMenuItem>
                    )}
                    {isMe && withinWindow && (
                      <DropdownMenuItem
                        onClick={() => onDeleteForEveryone(msg.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete for everyone
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
