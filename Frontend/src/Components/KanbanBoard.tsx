import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import MatchScoreBadge from './MatchScoreBadge';
import { calculateMatchScore } from '../Services/aiMatchService';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  skills?: string[];
  experience?: number;
}

interface KanbanBoardProps {
  searchQuery?: string;
  sortBy?: 'matchScore' | 'name';
}

const COLUMNS: { id: Candidate['status']; title: string }[] = [
  { id: 'applied', title: 'Müraciət olunub' },
  { id: 'interview', title: 'Müsahibədə' },
  { id: 'offer', title: 'İş Təklifi' },
  { id: 'rejected', title: 'İmtina edildi' },
];

const initialCandidates: Candidate[] = [
  { 
    id: '1', 
    name: 'Əli Məmmədov', 
    role: 'Frontend Developer', 
    status: 'applied',
    skills: ['React', 'TypeScript', 'CSS'],
    experience: 3
  },
  { 
    id: '2', 
    name: 'Aysel Əliyeva', 
    role: 'UI/UX Designer', 
    status: 'interview',
    skills: ['Figma', 'Adobe XD', 'Prototyping'],
    experience: 4
  },
  { 
    id: '3', 
    name: 'Rauf Qasımov', 
    role: 'Backend Developer', 
    status: 'offer',
    skills: ['Node.js', 'Express', 'PostgreSQL'],
    experience: 2
  },
];

const targetRequirements = {
  skills: ['React', 'TypeScript', 'Node.js', 'Tailwind'],
  experience: 2,
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ searchQuery = '', sortBy = 'matchScore' }) => {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  const handleOnDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Candidate['status'];

    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === draggableId
          ? { ...candidate, status: newStatus }
          : candidate
      )
    );
  };

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '16px', padding: '10px 0', overflowX: 'auto' }}>
      <DragDropContext onDragEnd={handleOnDragEnd}>
        {COLUMNS.map((col) => {
          let colCandidates = candidates
            .filter((c) => c.status === col.id)
            .filter((c) => 
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.role.toLowerCase().includes(searchQuery.toLowerCase())
            );

          colCandidates.sort((a, b) => {
            if (sortBy === 'matchScore') {
              const scoreA = calculateMatchScore(a.skills, targetRequirements.skills, a.experience, targetRequirements.experience).score;
              const scoreB = calculateMatchScore(b.skills, targetRequirements.skills, b.experience, targetRequirements.experience).score;
              return scoreB - scoreA;
            } else {
              return a.name.localeCompare(b.name);
            }
          });

          return (
            <div
              key={col.id}
              style={{
                flex: '1',
                minWidth: '260px',
                backgroundColor: '#f4f5f7',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#374151' }}>
                {col.title} ({colCandidates.length})
              </h3>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: '300px' }}
                  >
                    {colCandidates.map((candidate, index) => {
                      const matchResult = calculateMatchScore(
                        candidate.skills,
                        targetRequirements.skills,
                        candidate.experience,
                        targetRequirements.experience
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
                                userSelect: 'none',
                                padding: '12px',
                                margin: '0 0 8px 0',
                                backgroundColor: '#fff',
                                borderRadius: '6px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                ...provided.draggableProps.style,
                              }}
                            >
                              <strong style={{ display: 'block', color: '#111827' }}>
                                {candidate.name}
                              </strong>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                {candidate.role}
                              </span>

                              <div style={{ marginTop: '4px' }}>
                                <MatchScoreBadge score={matchResult.score} />
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