import { WorkflowStep } from '../types/agent';

interface Stage {
  key: WorkflowStep;
  label: string;
  icon: string;
}

const STAGES: Stage[] = [
  { key: 'analyzing', label: '问题分析', icon: '◇' },
  { key: 'waking', label: '专家唤醒', icon: '◎' },
  { key: 'collaborating', label: '并行协作', icon: '◈' },
  { key: 'synthesizing', label: '结果整合', icon: '◆' },
];

const STEP_ORDER: Record<WorkflowStep, number> = {
  idle: -1,
  analyzing: 0,
  waking: 1,
  collaborating: 2,
  synthesizing: 3,
  completed: 4,
};

interface WorkflowTimelineProps {
  step: WorkflowStep;
}

export default function WorkflowTimeline({ step }: WorkflowTimelineProps) {
  if (step === 'idle') return null;

  const currentIdx = STEP_ORDER[step];

  return (
    <div className="workflow-timeline">
      {STAGES.map((stage, i) => {
        let status: 'pending' | 'active' | 'completed';
        if (i < currentIdx) status = 'completed';
        else if (i === currentIdx) status = 'active';
        else status = 'pending';

        return (
          <div key={stage.key} className="timeline-stage-wrapper">
            {i > 0 && (
              <div className={`timeline-connector ${i <= currentIdx ? 'filled' : ''}`} />
            )}
            <div className={`timeline-stage ${status}`}>
              <div className={`timeline-dot ${status}`}>
                {status === 'completed' ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="timeline-dot-icon">{stage.icon}</span>
                )}
              </div>
              <span className={`timeline-label ${status}`}>{stage.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
