"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aiKnowledgeBaseSectionValues } from "@/lib/validation/aiAgent";
import type { AiAgentKnowledgeBaseEntry } from "@/lib/db/schema";
import {
  createKnowledgeBaseEntryAction,
  updateKnowledgeBaseEntryAction,
  deleteKnowledgeBaseEntryAction,
} from "@/app/[locale]/(app)/ai-team/actions";
import { containsLikelySsnOrItin } from "@/lib/sensitiveDataCheck";

type Section = (typeof aiKnowledgeBaseSectionValues)[number];

function EntryFields({
  section,
  title,
  content,
  onSectionChange,
  onTitleChange,
  onContentChange,
  tSection,
  t,
}: {
  section: Section;
  title: string;
  content: string;
  onSectionChange: (value: Section) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  tSection: (key: string) => string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Select value={section} onValueChange={(v) => onSectionChange(v as Section)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {aiKnowledgeBaseSectionValues.map((value) => (
            <SelectItem key={value} value={value}>
              {tSection(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder={t("kbTitlePlaceholder")}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <Textarea
        placeholder={t("kbContentPlaceholder")}
        rows={3}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
      />
      {containsLikelySsnOrItin(content) && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t("sensitiveDataWarning")}
        </p>
      )}
    </div>
  );
}

export function AiAgentKnowledgeBaseManager({
  agentId,
  entries,
}: {
  agentId: string;
  entries: AiAgentKnowledgeBaseEntry[];
}) {
  const t = useTranslations("AiTeam.form");
  const tSection = useTranslations("AiKnowledgeBaseSection");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    section: Section;
    title: string;
    content: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    section: Section;
    title: string;
    content: string;
  }>({ section: "faqs", title: "", content: "" });

  function startEdit(entry: AiAgentKnowledgeBaseEntry) {
    setEditingId(entry.id);
    setEditDraft({
      section: entry.section,
      title: entry.title,
      content: entry.content,
    });
  }

  function saveEdit(id: string) {
    if (!editDraft || !editDraft.title.trim() || !editDraft.content.trim()) return;
    startTransition(async () => {
      await updateKnowledgeBaseEntryAction(id, editDraft);
      setEditingId(null);
      setEditDraft(null);
    });
  }

  function removeEntry(id: string) {
    startTransition(async () => {
      await deleteKnowledgeBaseEntryAction(id);
    });
  }

  function submitNewEntry() {
    if (!newEntry.title.trim() || !newEntry.content.trim()) return;
    startTransition(async () => {
      await createKnowledgeBaseEntryAction(agentId, newEntry);
      setNewEntry({ section: "faqs", title: "", content: "" });
      setAdding(false);
    });
  }

  const bySection = new Map<string, AiAgentKnowledgeBaseEntry[]>();
  for (const entry of entries) {
    const list = bySection.get(entry.section) ?? [];
    list.push(entry);
    bySection.set(entry.section, list);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">
          {t("knowledgeBaseTitle")}
        </h2>
        {!adding && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4" />
            {t("addEntry")}
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <EntryFields
            section={newEntry.section}
            title={newEntry.title}
            content={newEntry.content}
            onSectionChange={(section) => setNewEntry((v) => ({ ...v, section }))}
            onTitleChange={(title) => setNewEntry((v) => ({ ...v, title }))}
            onContentChange={(content) => setNewEntry((v) => ({ ...v, content }))}
            tSection={tSection}
            t={t}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              <X className="h-4 w-4" />
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={submitNewEntry}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">{t("knowledgeBaseEmpty")}</p>
      )}

      {Array.from(bySection.entries()).map(([section, sectionEntries]) => (
        <div key={section} className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit">
            {tSection(section)}
          </Badge>
          {sectionEntries.map((entry) => (
            <div key={entry.id} className="rounded-md border border-border p-3">
              {editingId === entry.id && editDraft ? (
                <div className="flex flex-col gap-2">
                  <EntryFields
                    section={editDraft.section}
                    title={editDraft.title}
                    content={editDraft.content}
                    onSectionChange={(value) =>
                      setEditDraft((v) => (v ? { ...v, section: value } : v))
                    }
                    onTitleChange={(value) =>
                      setEditDraft((v) => (v ? { ...v, title: value } : v))
                    }
                    onContentChange={(value) =>
                      setEditDraft((v) => (v ? { ...v, content: value } : v))
                    }
                    tSection={tSection}
                    t={t}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                      {t("cancel")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => saveEdit(entry.id)}
                    >
                      {t("save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.title}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {entry.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => removeEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
