import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import MatchScoreBadge from "./MatchScoreBadge";
import { calculateMatchScore } from "../Services/aiMatchService";
import type {
  Candidate,
  CandidateStatus,
} from "../Types/recruitment";

interface TargetRequirements {
  skills: string[];
  experience: number;
}

interface KanbanBoardProps {
  candidates: Candidate[];
  onStatusChange: (
    candidateId: string,
    newStatus: CandidateStatus,
  ) => Promise<void>;
  targetRequirements: TargetRequirements;
}

const COLUMNS: {
  id: CandidateStatus;
  title: string;
}[] = [
  { id: "new", title: "Yeni" },
  { id: "screening", title: "Screening" },
  { id: "shortlisted", title: "Seçilmiş" },
  { id: "rejected", title: "İmtina edildi" },
  { id: "hired", title: "İşə qəbul" },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  candidates,
  onStatusChange,
  targetRequirements,
}) => {
  const handleOnDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as CandidateStatus;

    await onStatusChange(draggableId, newStatus);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        padding: "10px 0",
        overflowX: "auto",
      }}
    >
      <DragDropContext onDragEnd={handleOnDragEnd}>
        {COLUMNS.map((column) => {
          const columnCandidates = candidates
            .filter((candidate) => candidate.status === column.id)
            .sort((a, b) => {
              const scoreA = calculateMatchScore(
                a,
                targetRequirements,
              ).score;

              const scoreB = calculateMatchScore(
                b,
                targetRequirements,
              ).score;

              return scoreB - scoreA;
            });

          return (
            <div
              key={column.id}
              style={{
                flex: "1",
                minWidth: "260px",
                backgroundColor: "#f4f5f7",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  marginBottom: "12px",
                  color: "#374151",
                }}
              >
                {column.title} ({columnCandidates.length})
              </h3>

              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: "300px" }}
                  >
                    {columnCandidates.map((candidate, index) => {
                      const matchResult = calculateMatchScore(
                        candidate,
                        targetRequirements,
                      );

                      return (
                        <Draggable
                          key={candidate.id}
                          draggableId={candidate.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                userSelect: "none",
                                padding: "12px",
                                margin: "0 0 8px 0",
                                backgroundColor: "#fff",
                                borderRadius: "6px",
                                boxShadow:
                                  "0 1px 3px rgba(0,0,0,0.1)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                ...provided.draggableProps.style,
                              }}
                            >
                              <strong
                                style={{
                                  display: "block",
                                  color: "#111827",
                                }}
                              >
                                {candidate.name}
                              </strong>

                              <span
                                style={{
                                  fontSize: "13px",
                                  color: "#6b7280",
                                }}
                              >
                                {candidate.experience} il təcrübə
                              </span>

                              <div style={{ marginTop: "4px" }}>
                                <MatchScoreBadge
                                  score={matchResult.score}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
