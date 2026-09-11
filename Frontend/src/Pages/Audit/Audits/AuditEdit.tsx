import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../../Components/PageHeader";
import { Loader2 } from "lucide-react";
import { getAuditById, updateAudit } from "../../../Services/auditsService";
import type { AuditScores } from "../../../Types/audit";

const AuditEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [scores,setScores] = useState<AuditScores>({
    cleanliness:0,
    service:0,
    food:0,
    staff:0,
  });

  const [comments,setComments]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);


  useEffect(()=>{
    if(!id) return;

    getAuditById(id).then((audit)=>{
      setScores(audit.scores);
      setComments(audit.comments || "");
      setLoading(false);
    });

  },[id]);


  async function submit(e:React.FormEvent){
    e.preventDefault();

    if(!id)return;

    setSaving(true);

    await updateAudit(id,{
      scores,
      comments
    });

    setSaving(false);

    navigate(`/app/audit/audits/${id}`);
  }


  if(loading){
    return <Loader2 className="spin"/>;
  }


  return (
    <div>

      <PageHeader title="Edit audit"/>


      <form className="form-card" onSubmit={submit}>

        {Object.entries(scores).map(([key,value])=>(

          <div className="form-group" key={key}>

            <label className="form-label">
              {key}
            </label>

            <input
              className="input-field"
              type="number"
              min="1"
              max="10"
              value={value}
              onChange={(e)=>
                setScores({
                  ...scores,
                  [key]:Number(e.target.value)
                })
              }
            />

          </div>

        ))}


        <div className="form-group">

          <label className="form-label">
            Comments
          </label>

          <textarea
            className="input-field"
            value={comments}
            onChange={(e)=>setComments(e.target.value)}
          />

        </div>


        <button
          className="btn-primary"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>


      </form>


    </div>
  );
};


export default AuditEdit;
