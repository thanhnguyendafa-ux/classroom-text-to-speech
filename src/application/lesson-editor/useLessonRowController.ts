import { useCallback, useState, type Dispatch, type DragEvent, type FormEvent, type SetStateAction } from "react";
import type { LanguageCode, SpeechItem } from "../../types";
import { detectLanguage, parseLineSymbols } from "../../features/lesson-editor/speechItemFactory";
import { duplicateSet, joinWithNext, moveSpeechItem, ungroupSet, updateSpeechItem } from "../../features/lesson-editor/speechItemCommands";

type Input = { speechList: SpeechItem[]; setSpeechList: Dispatch<SetStateAction<SpeechItem[]>>; speed: number; playingItemId: string | null; stopPlayback: () => void; editingItemId: string | null; setEditingItemId: Dispatch<SetStateAction<string | null>>; editingText: string; setEditingText: Dispatch<SetStateAction<string>> };

export function useLessonRowController(input: Input) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newRowText, setNewRowText] = useState("");
  const [newRowLang, setNewRowLang] = useState<LanguageCode | "auto">("auto");
  const [newRowRepeats, setNewRowRepeats] = useState(1);
  const [newRowDelay, setNewRowDelay] = useState(2);
  const addSingleRow = useCallback((event: FormEvent) => { event.preventDefault(); if (!newRowText.trim()) return; const parsed = parseLineSymbols(newRowText.trim(), newRowRepeats, newRowDelay); const detected = detectLanguage(parsed.cleanText); input.setSpeechList((items) => [...items, { id: "row-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), text: parsed.cleanText, detectedLang: detected, selectedLang: newRowLang, resolvedLang: newRowLang === "auto" ? detected : newRowLang, repeats: parsed.repeats, delaySec: parsed.delaySec, speed: input.speed }]); setNewRowText(""); setNewRowLang("auto"); setNewRowRepeats(1); setNewRowDelay(2); }, [input.setSpeechList, input.speed, newRowDelay, newRowLang, newRowRepeats, newRowText]);
  const dragStart = useCallback((event: DragEvent, index: number) => { setDraggedIndex(index); event.dataTransfer.effectAllowed = "move"; if (event.currentTarget instanceof HTMLElement) event.currentTarget.style.opacity = "0.4"; }, []);
  const dragEnd = useCallback((event: DragEvent) => { if (event.currentTarget instanceof HTMLElement) event.currentTarget.style.opacity = "1"; setDraggedIndex(null); setDragOverIndex(null); }, []);
  const dragOver = useCallback((event: DragEvent, index: number) => { event.preventDefault(); setDragOverIndex((current) => current === index ? current : index); }, []);
  const dropRow = useCallback((event: DragEvent, targetIndex: number) => { event.preventDefault(); if (draggedIndex === null) return; input.setSpeechList((items) => moveSpeechItem(items, draggedIndex, targetIndex)); setDraggedIndex(null); setDragOverIndex(null); }, [draggedIndex, input.setSpeechList]);
  const updateRepeats = useCallback((id: string, count: number) => input.setSpeechList((items) => updateSpeechItem(items, id, { repeats: count })), [input.setSpeechList]);
  const updateDelay = useCallback((id: string, delay: number) => input.setSpeechList((items) => updateSpeechItem(items, id, { delaySec: delay })), [input.setSpeechList]);
  const updateSpeed = useCallback((id: string, speed: number) => input.setSpeechList((items) => updateSpeechItem(items, id, { speed })), [input.setSpeechList]);
  const updateLanguage = useCallback((id: string, selectedLang: LanguageCode | "auto") => input.setSpeechList((items) => updateSpeechItem(items, id, { selectedLang })), [input.setSpeechList]);
  const startEditing = useCallback((item: SpeechItem) => { input.setEditingItemId(item.id); input.setEditingText(item.text); }, [input.setEditingItemId, input.setEditingText]);
  const deleteRow = useCallback((id: string) => { if (input.playingItemId === id) input.stopPlayback(); input.setSpeechList((items) => items.filter((item) => item.id !== id)); }, [input.playingItemId, input.setSpeechList, input.stopPlayback]);
  const saveEditing = useCallback((id: string) => { if (!input.editingText.trim()) { deleteRow(id); return; } input.setSpeechList((items) => items.map((item) => { if (item.id !== id) return item; const parsed = parseLineSymbols(input.editingText.trim(), item.repeats, item.delaySec); const detected = detectLanguage(parsed.cleanText); return { ...item, text: parsed.cleanText, detectedLang: detected, resolvedLang: item.selectedLang === "auto" ? detected : item.selectedLang, repeats: parsed.repeats, delaySec: parsed.delaySec }; })); input.setEditingItemId(null); input.setEditingText(""); }, [deleteRow, input.editingText, input.setEditingItemId, input.setEditingText, input.setSpeechList]);
  const joinNext = useCallback((index: number) => input.setSpeechList((items) => joinWithNext(items, index, "set-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7))), [input.setSpeechList]);
  const ungroup = useCallback((setId: string) => input.setSpeechList((items) => ungroupSet(items, setId)), [input.setSpeechList]);
  const duplicate = useCallback((setId: string) => { const nonce = Date.now() + "-" + Math.random().toString(36).slice(2, 7); input.setSpeechList((items) => duplicateSet(items, setId, { createSetId: () => "set-" + nonce, createRowId: (sourceId) => "row-" + nonce + "-" + sourceId + "-dup" })); }, [input.setSpeechList]);
  return { draggedIndex, dragOverIndex, newRowText, setNewRowText, newRowLang, setNewRowLang, newRowRepeats, setNewRowRepeats, newRowDelay, setNewRowDelay, addSingleRow, dragStart, dragEnd, dragOver, dropRow, updateRepeats, updateDelay, updateSpeed, updateLanguage, startEditing, saveEditing, deleteRow, joinNext, ungroup, duplicate };
}
