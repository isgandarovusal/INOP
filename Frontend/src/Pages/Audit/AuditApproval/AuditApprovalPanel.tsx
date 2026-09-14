import {
  useEffect,
  useState,
} from "react";

import {
  getApprovals,
  updateApproval,
} from "../../../Services/auditApprovalService";


type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";


interface AuditApproval {
  _id: string;
  status: ApprovalStatus;
  comment?: string;
}


interface AuditApprovalPanelProps {
  auditId: string;
}


export default function AuditApprovalPanel(
  {
    auditId,
  }: AuditApprovalPanelProps
) {

  const [
    approvals,
    setApprovals,
  ] = useState<AuditApproval[]>([]);


  useEffect(() => {

    const load = async () => {

      const res = await getApprovals(
        auditId
      );

      setApprovals(
        res.data || []
      );

    };

    void load();

  }, [auditId]);


  async function changeStatus(
    id: string,
    status: ApprovalStatus
  ) {

    await updateApproval(
      id,
      {
        status,
      }
    );

    const res = await getApprovals(
      auditId
    );

    setApprovals(
      res.data || []
    );

  }


  return (
    <div className="audit-modern-card">

      <h3>
        Audit Approval
      </h3>


      {
        approvals.length === 0
          ?
          <p>
            No approval requests
          </p>
          :
          approvals.map(
            (item) => (

              <div
                key={item._id}
                className="detail-row"
              >

                <div>

                  <strong>
                    {item.status}
                  </strong>

                  <p>
                    {item.comment}
                  </p>

                </div>


                <div>

                  <button
                    onClick={() =>
                      changeStatus(
                        item._id,
                        "approved"
                      )
                    }
                  >
                    Approve
                  </button>


                  <button
                    onClick={() =>
                      changeStatus(
                        item._id,
                        "rejected"
                      )
                    }
                  >
                    Reject
                  </button>

                </div>

              </div>

            )
          )
      }


    </div>
  );

}
