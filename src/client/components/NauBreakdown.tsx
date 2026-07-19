import React, { useState } from "react";
import type { NauBreakdown as NauBreakdownType } from "../utils/fields.ts";

interface Props {
  breakdown: NauBreakdownType;
  compact?: boolean;
}

const CATEGORIES = [
  { key: "userMessages", label: "User Messages", icon: "💬" },
  { key: "installs", label: "Installs", icon: "📦" },
  { key: "planning", label: "Planning", icon: "📋" },
  { key: "appCreations", label: "App Creations", icon: "🆕" },
  { key: "interviews", label: "Interviews", icon: "❓" },
] as const;

export function NauBreakdownPanel({ breakdown, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (breakdown.totalInteractions === 0) {
    return (
      <span className="nau-breakdown-toggle" style={{ cursor: "default", opacity: 0.5 }}>
        0 NAU
      </span>
    );
  }

  const visibleCategories = CATEGORIES.filter(
    (cat) => breakdown[cat.key] > 0
  );

  return (
    <div className={`nau-breakdown ${compact ? "nau-breakdown--compact" : ""}`}>
      <button
        className="nau-breakdown-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        type="button"
        aria-expanded={expanded}
      >
        <span className={`nau-breakdown-chevron ${expanded ? "expanded" : ""}`}>▸</span>
        <span>{breakdown.totalNau.toLocaleString()} NAU</span>
      </button>

      {expanded && (
        <div className="nau-breakdown-panel" onClick={(e) => e.stopPropagation()}>
          {visibleCategories.map((cat) => {
            const count = breakdown[cat.key];
            const nau = count * breakdown.nauPerUnit;
            const pct = breakdown.totalInteractions > 0
              ? Math.round((count / breakdown.totalInteractions) * 100)
              : 0;

            return (
              <div key={cat.key} className="nau-breakdown-row">
                <div className="nau-breakdown-label">
                  <span className="nau-breakdown-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="nau-breakdown-values">
                  <span className="nau-breakdown-count">{count}</span>
                  <div className="nau-breakdown-bar-container">
                    <div
                      className="nau-breakdown-bar"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="nau-breakdown-nau">= {nau.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          <div className="nau-breakdown-row nau-breakdown-row--total">
            <div className="nau-breakdown-label">
              <span className="nau-breakdown-icon">Σ</span>
              <span><strong>Total</strong></span>
            </div>
            <div className="nau-breakdown-values">
              <span className="nau-breakdown-count"><strong>{breakdown.totalInteractions}</strong></span>
              <div className="nau-breakdown-bar-container">
                <div className="nau-breakdown-bar" style={{ width: "100%" }} />
              </div>
              <span className="nau-breakdown-nau"><strong>= {breakdown.totalNau.toLocaleString()}</strong></span>
            </div>
          </div>
          <div className="nau-breakdown-formula">
            Each interaction = {breakdown.nauPerUnit} NAU
          </div>
        </div>
      )}
    </div>
  );
}
