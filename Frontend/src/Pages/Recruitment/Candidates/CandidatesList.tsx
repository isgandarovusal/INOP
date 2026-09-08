import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus, Search, ArrowUpDown } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import KanbanBoard from "../../../Components/KanbanBoard";
import type { Candidate } from "../../../Components/KanbanBoard";
import MatchScoreBadge from "../../../Components/MatchScoreBadge";
import { calculateMatchScore } from "../../../Services/aiMatchService";

const targetRequirements = {
  skills: ['React', 'TypeScript', 'Node.js', 'Tailwind'],
  experience: 2,
};

const mockCandidates: Candidate[] = [
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

export const CandidatesList: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'matchScore' | 'name'>('matchScore');

  const filteredCandidates = mockCandidates
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'matchScore') {
        const scoreA = calculateMatchScore(a.skills, targetRequirements.skills, a.experience, targetRequirements.experience).score;
        const scoreB = calculateMatchScore(b.skills, targetRequirements.skills, b.experience, targetRequirements.experience).score;
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Namizədlər"
        subtitle="İşə qəbul prosesində olan namizədlərin idarə olunması"
        actions={
          <button
            onClick={() => navigate('/app/recruitment/candidates/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Plus size={18} /> Yeni Namizəd
          </button>
        }
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '20px 0',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
          />
          <input
            type="text"
            placeholder="Axtar (Ad, Vəzifə)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              outline: 'none',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={16} color="#6b7280" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'matchScore' | 'name')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="matchScore">AI Uyğunluq Balı</option>
              <option value="name">Ad üzrə (A-Z)</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: '#e5e7eb',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                border: 'none',
                backgroundColor: viewMode === 'kanban' ? '#fff' : 'transparent',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: viewMode === 'kanban' ? 600 : 400,
                boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <LayoutGrid size={16} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                border: 'none',
                backgroundColor: viewMode === 'list' ? '#fff' : 'transparent',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: viewMode === 'list' ? 600 : 400,
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <List size={16} /> Siyahı
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <KanbanBoard searchQuery={searchQuery} sortBy={sortBy} />
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '13px' }}>Namizəd</th>
                <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '13px' }}>Vəzifə</th>
                <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '13px' }}>Mərhələ</th>
                <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '13px' }}>AI Uyğunluq</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => {
                const matchResult = calculateMatchScore(
                  candidate.skills,
                  targetRequirements.skills,
                  candidate.experience,
                  targetRequirements.experience
                );

                return (
                  <tr key={candidate.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{candidate.name}</td>
                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{candidate.role}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#6b7280' }}>
                      {candidate.status === 'applied' && 'Müraciət olunub'}
                      {candidate.status === 'interview' && 'Müsahibədə'}
                      {candidate.status === 'offer' && 'İş Təklifi'}
                      {candidate.status === 'rejected' && 'İmtina edildi'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <MatchScoreBadge score={matchResult.score} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CandidatesList;