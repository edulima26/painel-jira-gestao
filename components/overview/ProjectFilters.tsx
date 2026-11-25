"use client";

import { QUARTERS, type FrontInput, type Quarter } from "@/lib/overview";

interface Props {
  fronts: FrontInput[];
  currentQuarter: Quarter;
  quarter: string;
  front: string;
  onQuarterChange: (value: string) => void;
  onFrontChange: (value: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  hasFilters: boolean;
  onReset: () => void;
}

// Filtros compartilhados das páginas do analista: busca (opcional), trimestre e frente de trabalho.
export default function ProjectFilters({
  fronts,
  currentQuarter,
  quarter,
  front,
  onQuarterChange,
  onFrontChange,
  search,
  onSearchChange,
  hasFilters,
  onReset,
}: Props) {
  return (
    <section className="card flex flex-wrap items-end gap-4 print:hidden">
      {onSearchChange ? (
        <div className="min-w-[220px] flex-1">
          <label className="label" htmlFor="filter-search">Buscar projeto</label>
          <input
            id="filter-search"
            type="search"
            className="input"
            placeholder="Nome do projeto"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="filter-quarter">Trimestre</label>
        <select id="filter-quarter" className="input" value={quarter} onChange={(e) => onQuarterChange(e.target.value)}>
          <option value="todos">Ano todo</option>
          {QUARTERS.map((item) => (
            <option key={item} value={String(item)}>
              {item}º trimestre{item === currentQuarter ? " (atual)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="filter-front">Frente de trabalho</label>
        <select id="filter-front" className="input" value={front} onChange={(e) => onFrontChange(e.target.value)}>
          <option value="todas">Todas</option>
          {fronts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {hasFilters ? (
        <button type="button" className="btn-secondary" onClick={onReset}>
          Limpar filtros
        </button>
      ) : null}
    </section>
  );
}
