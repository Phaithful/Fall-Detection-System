import React from 'react'
import { motion } from 'framer-motion'
import { Film, Bone, Zap, Brain, Check, Loader2, UploadCloud } from 'lucide-react'

const STAGES = [
  { id: 'upload',   label: 'Upload',           Icon: UploadCloud },
  { id: 'extract',  label: 'Frame Extraction', Icon: Film        },
  { id: 'pose',     label: 'Pose Estimation',  Icon: Bone        },
  { id: 'motion',   label: 'Motion Analysis',  Icon: Zap         },
  { id: 'classify', label: 'Classification',   Icon: Brain       },
]

const STAGE_IDX = {
  'Queued': 0, 'Initialising': 1,
  'Frame Extraction': 1, 'Pose Estimation': 2,
  'Motion Analysis': 3, 'Classification': 4, 'Complete': 5,
}

export default function ProgressPipeline({ stage, progress, status }) {
  const current    = STAGE_IDX[stage] ?? 0
  const isComplete = status === 'complete'
  const isError    = status === 'error'

  return (
    <div className="space-y-4">
      {/* Steps */}
      <div className="flex items-start gap-0">
        {STAGES.map(({ id, label, Icon }, i) => {
          const done   = isComplete || i < current
          const active = !isComplete && i === current
          return (
            <React.Fragment key={id}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <motion.div
                  animate={{
                    backgroundColor: done ? '#059669' : active ? '#2563EB' : '#F1F5F9',
                    borderColor:     done ? '#059669' : active ? '#2563EB' : '#E2E8F0',
                    color:           done || active ? '#fff' : '#94A3B8',
                  }}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                >
                  {done ? <Check size={14} strokeWidth={2.5} /> :
                   active ? <Loader2 size={14} className="animate-spin" /> :
                   <Icon size={13} strokeWidth={2} />}
                </motion.div>
                <span className={`text-[10px] mt-1.5 text-center leading-tight px-1
                  ${done ? 'text-emerald-600 font-medium' : active ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <motion.div
                  className="h-0.5 flex-1 self-start mt-4"
                  animate={{ backgroundColor: i < current ? '#059669' : '#E2E8F0' }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-500">
            {isError ? 'Error' : isComplete ? 'Analysis complete' : `${stage}…`}
          </span>
          <span className="text-xs font-mono font-medium text-slate-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isError ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
