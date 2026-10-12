import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHRActionContext } from '../Hooks/useHRActionContext';
import { getAIStatus, type AIStatus } from '../Services/hrAiService';

// Shared by vacancy proposals and both CV review paths. Setup is checked only
// on deliberate intent; opening a page never starts another API/provider call.
export default function AIAvailability({ cv = false }: { cv?: boolean }) {
  const { t } = useTranslation(), context = useHRActionContext();
  const [state, setState] = useState<{ key: string; pending?: boolean; error?: boolean; data?: AIStatus }>({ key: '' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), [context.key]);
  const visible = state.key === context.key ? state : undefined;
  async function check() {
    active.current?.abort();
    const controller = new AbortController(), key = context.key;
    active.current = controller; setState({ key, pending: true });
    try {
      const data = await getAIStatus(controller.signal, key);
      if (!controller.signal.aborted && context.current.current === key) setState({ key, data });
    } catch {
      if (!controller.signal.aborted && context.current.current === key) setState({ key, error: true });
    }
  }
  return <div data-ai-availability>
    <p role="status">{t(visible?.error ? 'hrAi.setupError' : visible?.data ? `hrAi.setupState.${visible.data.state}` : 'hrAi.setupUnknown')}</p>
    {cv && visible?.data && !visible.data.cvReviewApproved && <p>{t('hrAi.cvApprovalRequired')}</p>}
    <button type="button" className="btn-secondary" data-ai-action="configuration-status" disabled={visible?.pending} onClick={() => void check()}>{t(visible?.pending ? 'common.actions.loading' : 'hrAi.checkSetup')}</button>
  </div>;
}
