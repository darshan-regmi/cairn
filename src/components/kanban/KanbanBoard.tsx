"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Collision,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveTasksAction } from "@/actions/tasks";
import {
  TASK_STATUSES,
  columnDotClass,
  priorityClass,
  priorityLabel,
  sourceLabel,
  taskStatusLabel,
  type Priority,
  type TaskSource,
  type TaskStatus,
} from "@/lib/status";
import { TaskDialog } from "./TaskDialog";

export interface KanbanCard {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due: string | null;
  notes: string | null;
  commit: string | null;
  source: TaskSource;
  isOverdue: boolean;
}

export type DialogState =
  | { mode: "create"; status: TaskStatus }
  | { mode: "edit"; card: KanbanCard }
  | null;

const cardId = (id: string) => `card-${id}`;
const columnId = (status: string) => `column-${status}`;
const isColumnId = (id: string) => id.startsWith("column-");
const stripColumn = (id: string) => id.slice("column-".length);

type Rect = { top: number; left: number; right: number; bottom: number };

const EMPTY_RECT: Rect = { top: 0, left: 0, right: 0, bottom: 0 };

const rectArea = (rect: Rect) =>
  Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);

/**
 * Board-wide collision strategy for four side-by-side columns.
 *
 * closestCorners alone is unreliable here: it measures corner distances, so
 * a card in an *adjacent* column can be "closer" to the pointer than the
 * hovered column's own corners.
 *
 * Instead: prefer droppables the dragged card actually overlaps, breaking
 * ties in favour of the smallest target so a card beats its containing
 * column. When nothing overlaps (the card is floating over empty airspace),
 * fall back to the container that contains the pointer, then to
 * closestCorners as a last resort (e.g. when dropping in a column gap).
 */
function boardCollision(args: Parameters<CollisionDetection>[0]): Collision[] {
  const overlaps = rectIntersection(args);
  if (overlaps.length > 0) {
    return overlaps
      .map((collision) => ({
        collision,
        area: rectArea(args.droppableRects.get(collision.id) ?? EMPTY_RECT),
      }))
      .sort((a, b) => a.area - b.area)
      .map(({ collision }) => collision);
  }

  const within = pointerWithin(args);
  if (within.length > 0) return within;

  return closestCorners(args);
}

export function KanbanBoard({
  milestoneId,
  initialCards,
}: {
  milestoneId: string;
  initialCards: KanbanCard[];
}) {
  const [cards, setCards] = useState<KanbanCard[]>(initialCards);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  // Serialise board writes so drags persist in order and last-write-wins.
  const persistQueue = useRef<Promise<void>>(Promise.resolve());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(
    () =>
      TASK_STATUSES.map((status) => ({
        status,
        cards: cards.filter((card) => card.status === status),
      })),
    [cards],
  );

  function persist(nextCards: KanbanCard[]) {
    const payload = {
      milestoneId,
      columns: TASK_STATUSES.map((status) => ({
        status,
        taskIds: nextCards
          .filter((card) => card.status === status)
          .map((card) => card.id),
      })),
    };
    persistQueue.current = persistQueue.current
      .then(() => moveTasksAction(payload))
      .catch(() => {});
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCard(
      cards.find((card) => cardId(card.id) === event.active.id) ?? null,
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const dragged = cards.find((card) => cardId(card.id) === active.id);
    if (!dragged) return;

    // Which column did the drag finish in?
    const overId = String(over.id);
    let destStatus: TaskStatus;
    if (isColumnId(overId)) {
      destStatus = stripColumn(overId) as TaskStatus;
    } else {
      const overCard = cards.find((card) => cardId(card.id) === over.id);
      destStatus = overCard?.status ?? dragged.status;
    }

    const withoutDragged = cards.filter((card) => card.id !== dragged.id);
    const destCards = withoutDragged.filter(
      (card) => card.status === destStatus,
    );

    // Dropping onto a card inserts before it; onto the column body appends.
    let insertAt = destCards.length;
    if (!isColumnId(overId)) {
      const overCard = cards.find((card) => cardId(card.id) === over.id);
      const overIndex = overCard
        ? destCards.findIndex((card) => card.id === overCard.id)
        : -1;
      if (overIndex >= 0) insertAt = overIndex;
    }

    // Dropped back onto its own spot: nothing changed.
    const originalIndex = cards
      .filter((card) => card.status === dragged.status)
      .findIndex((card) => card.id === dragged.id);
    if (dragged.status === destStatus && insertAt === originalIndex) return;

    destCards.splice(insertAt, 0, { ...dragged, status: destStatus });

    const nextCards = TASK_STATUSES.flatMap((status) =>
      status === destStatus
        ? destCards
        : withoutDragged.filter((card) => card.status === status),
    );

    setCards(nextCards);
    persist(nextCards);
  }

  return (
    <div className="mt-8">
      {/* A stable id is required: dnd-kit derives the sortable cards'
          aria-describedby from it; without one it falls back to a module-level
          counter that differs between the SSR render and the client, causing
          a React hydration mismatch. */}
      <DndContext
        id="kanban-board"
        sensors={sensors}
        collisionDetection={boardCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCard(null)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              column={column}
              onAdd={() => setDialog({ mode: "create", status: column.status })}
              onEdit={(card) => setDialog({ mode: "edit", card })}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <OverlayCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {dialog && (
        <TaskDialog
          key={`${dialog.mode}-${dialog.mode === "edit" ? dialog.card.id : dialog.status}`}
          milestoneId={milestoneId}
          dialog={dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  onAdd,
  onEdit,
}: {
  column: { status: TaskStatus; cards: KanbanCard[] };
  onAdd: () => void;
  onEdit: (card: KanbanCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(column.status) });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${taskStatusLabel[column.status]} tasks`}
      className={`flex min-h-32 flex-col rounded-lg border p-3 transition-colors ${
        isOver
          ? "border-accent bg-accent/10"
          : "border-edge bg-black/[0.02] dark:bg-white/[0.04]"
      }`}
    >
      <header className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${columnDotClass[column.status]}`}
          />
          <h2 className="text-sm font-medium">
            {taskStatusLabel[column.status]}
          </h2>
          <span className="rounded-full bg-edge px-1.5 text-xs text-muted">
            {column.cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add task to ${taskStatusLabel[column.status]}`}
          className="rounded-md px-2 py-0.5 text-sm text-muted transition-colors hover:bg-accent/10 hover:text-fg"
        >
          +
        </button>
      </header>

      <SortableContext
        items={column.cards.map((card) => cardId(card.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-1 flex-col gap-2">
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} onEdit={onEdit} />
          ))}
          {column.cards.length === 0 && (
            <li className="rounded-md border border-dashed border-edge px-3 py-6 text-center text-xs text-muted">
              Drop tasks here
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

function SortableCard({
  card,
  onEdit,
}: {
  card: KanbanCard;
  onEdit: (card: KanbanCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cardId(card.id) });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group relative rounded-md border bg-surface p-3 shadow-sm ${
        card.isOverdue
          ? "border-red-300 dark:border-red-900"
          : "border-edge"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {card.isOverdue && (
        <span
          aria-label="Overdue"
          className="absolute -top-1.5 right-2 rounded-full bg-red-500 px-1.5 py-px text-[10px] font-semibold text-white"
        >
          Overdue
        </span>
      )}
      <p className="text-sm font-medium leading-snug">{card.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium ${priorityClass[card.priority]}`}
        >
          {priorityLabel[card.priority]}
        </span>
        {card.due && (
          <span
            className={`text-xs ${
              card.isOverdue
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-muted"
            }`}
          >
            {card.due}
          </span>
        )}
        {card.source !== "PLANNED" && (
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {sourceLabel[card.source]}
          </span>
        )}
        {card.commit && (
          <code className="rounded bg-edge px-1 py-px text-[10px] text-muted">
            {card.commit}
          </code>
        )}
      </div>
      {card.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-muted">{card.notes}</p>
      )}
      <div className="mt-2 flex gap-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(card);
          }}
          className="text-xs text-muted transition-colors hover:text-fg"
        >
          Edit
        </button>
      </div>
    </li>
  );
}

function OverlayCard({ card }: { card: KanbanCard }) {
  return (
    <div
      className={`w-72 rotate-2 rounded-md border bg-surface p-3 shadow-xl ${
        card.isOverdue ? "border-red-300 dark:border-red-900" : "border-edge"
      }`}
    >
      <p className="text-sm font-medium leading-snug">{card.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium ${priorityClass[card.priority]}`}
        >
          {priorityLabel[card.priority]}
        </span>
        {card.due && <span className="text-xs text-muted">{card.due}</span>}
      </div>
    </div>
  );
}