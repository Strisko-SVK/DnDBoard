"use client";
import React from 'react';
import { Quest } from '@dndboard/shared';

interface Props {
  quest: Quest;
  onOpen: (q: Quest) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDM?: boolean;
}
export function QuestCard({ quest, onOpen, onMoveUp, onMoveDown, isDM }: Props) {
  return (
    <div className="card cursor-pointer group relative" onClick={()=>onOpen(quest)}>
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold leading-snug pr-2">{quest.title}</h3>
        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-ink/10">{quest.difficulty}</span>
      </div>
      <p className="text-xs mt-1 line-clamp-3 opacity-80">{quest.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {quest.tags.slice(0,4).map(t=> <span key={t} className="badge">{t}</span>)}
      </div>
      {isDM && (
        <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition" onClick={e=>e.stopPropagation()}>
          <button onClick={onMoveUp} className="text-[10px] px-1 rounded bg-ink/10">▲</button>
          <button onClick={onMoveDown} className="text-[10px] px-1 rounded bg-ink/10">▼</button>
        </div>
      )}
    </div>
  );
}

