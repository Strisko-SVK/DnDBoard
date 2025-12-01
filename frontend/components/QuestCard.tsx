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

const difficultyClasses: Record<string, string> = {
  'Trivial': 'difficulty-trivial',
  'Easy': 'difficulty-easy',
  'Medium': 'difficulty-medium',
  'Hard': 'difficulty-hard',
  'Deadly': 'difficulty-deadly',
};

const difficultyIcons: Record<string, string> = {
  'Trivial': '⚪',
  'Easy': '🟢',
  'Medium': '🟡',
  'Hard': '🟠',
  'Deadly': '💀',
};

export function QuestCard({ quest, onOpen, onMoveUp, onMoveDown, isDM }: Props) {
  const difficultyClass = difficultyClasses[quest.difficulty] || 'badge';
  const difficultyIcon = difficultyIcons[quest.difficulty] || '⚪';

  return (
    <div
      className="quest-card group relative break-inside-avoid mb-4"
      onClick={() => onOpen(quest)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(quest);
        }
      }}
      aria-label={`Quest: ${quest.title}`}
    >
      {/* DM Reorder Controls */}
      {isDM && (
        <div
          className="absolute -top-2 -right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onMoveUp}
            className="w-6 h-6 flex items-center justify-center text-xs rounded-full bg-leather text-parchment hover:bg-leather-light shadow-md"
            aria-label="Move quest up"
            title="Move up"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            className="w-6 h-6 flex items-center justify-center text-xs rounded-full bg-leather text-parchment hover:bg-leather-light shadow-md"
            aria-label="Move quest down"
            title="Move down"
          >
            ▼
          </button>
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-0">
        {/* Title Section */}
        <div className="flex items-start gap-2 mb-2">
          <h3 className="font-display font-bold text-lg leading-tight text-ink flex-1 pr-2">
            {quest.title}
          </h3>
        </div>

        {/* Difficulty Badge */}
        <div className="mb-2">
          <span className={`${difficultyClass} inline-flex items-center gap-1`}>
            <span>{difficultyIcon}</span>
            <span className="font-medium">{quest.difficulty}</span>
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-ink leading-relaxed mb-3 line-clamp-4">
          {quest.summary}
          {quest.summary.length > 100 && '...'}
        </p>

        {/* Footer: Tags and Extras */}
        <div className="flex items-end justify-between gap-2">
          {/* Tags */}
          <div className="flex flex-wrap gap-1 flex-1">
            {quest.tags.slice(0, 3).map(t => (
              <span key={t} className="badge text-[10px]">
                #{t}
              </span>
            ))}
            {quest.tags.length > 3 && (
              <span className="badge text-[10px]">+{quest.tags.length - 3}</span>
            )}
          </div>

          {/* Extras Icons */}
          <div className="flex items-center gap-1 text-xs text-ink/60">
            {/* Placeholder for attachments/rewards - can be extended later */}
            <span title="Rewards available" className="opacity-70">💰</span>
          </div>
        </div>
      </div>
    </div>
  );
}

