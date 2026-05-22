import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Film, UploadCloud, Play, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { videoApi } from '../services/api'
import { formatBytes } from '../utils/formatters'
import DropZone from '../components/Upload/DropZone'
import ProgressPipeline from '../components/Upload/ProgressPipeline'
import ResultsPanel from '../components/Upload/ResultsPanel'
import AnnotatedFrames from '../components/Upload/AnnotatedFrames'

export default function Upload() {
  const [file,       setFile]     = useState(null)
  const [videoId,    setVideoId]  = useState(null)
  const [uploadPct,  setUploadPct] = useState(0)
  const [stage,      setStage]    = useState('idle') // idle|uploading|ready|analyzing|complete|error
  const [jobStatus,  setJobStatus] = useState(null)
  const [result,     setResult]   = useState(null)
  const videoPreviewRef = useRef(null)
  const pollRef = useRef(null)

  const handleFile = useCallback((f) => {
    setFile(f)
    setVideoId(null)
    setResult(null)
    setStage('idle')
    setJobStatus(null)
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = URL.createObjectURL(f)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setStage('uploading')
    setUploadPct(0)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await videoApi.upload(form, setUploadPct)
      setVideoId(data.video_id)
      setStage('ready')
      toast.success('Upload complete! Click Analyze to begin.')
    } catch {
      setStage('error')
    }
  }, [file])

  const handleAnalyze = useCallback(async () => {
    if (!videoId) return
    setStage('analyzing')
    setResult(null)
    try {
      await videoApi.analyze(videoId)
      pollRef.current = setInterval(async () => {
        const { data } = await videoApi.status(videoId)
        setJobStatus(data)
        if (data.status === 'complete') {
          clearInterval(pollRef.current)
          const { data: res } = await videoApi.results(videoId)
          setResult(res)
          setStage('complete')
          toast.success(`Analysis complete — ${res.falls_detected} fall(s) detected`)
        } else if (data.status === 'error') {
          clearInterval(pollRef.current)
          setStage('error')
          toast.error('Analysis failed: ' + data.message)
        }
      }, 1500)
    } catch {
      setStage('error')
    }
  }, [videoId])

  useEffect(() => () => clearInterval(pollRef.current), [])

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Upload & Analyze</h2>
          <p className="page-subtitle">Run the full detection pipeline on a recorded video</p>
        </div>
      </div>

      {/* Drop zone */}
      <DropZone onFile={handleFile} disabled={stage === 'uploading' || stage === 'analyzing'} />

      {/* File info + action */}
      {file && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Film size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {stage === 'idle' && (
              <button onClick={handleUpload} className="btn-primary">
                <UploadCloud size={13} /> Upload
              </button>
            )}
            {stage === 'ready' && (
              <button onClick={handleAnalyze} className="btn-primary">
                <Play size={13} /> Analyze
              </button>
            )}
            {stage === 'complete' && (
              <button onClick={handleAnalyze} className="btn-secondary">
                <RefreshCw size={13} /> Re-analyze
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Upload progress */}
      {stage === 'uploading' && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Uploading…</span>
            <span className="font-mono text-slate-700">{uploadPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              animate={{ width: `${uploadPct}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>
      )}

      {/* Two-column layout: pipeline + preview */}
      {file && (stage === 'analyzing' || stage === 'complete' || stage === 'ready') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Analysis pipeline */}
          {(stage === 'analyzing' || stage === 'complete') && jobStatus && (
            <div className="card">
              <h3 className="section-title">Detection Pipeline</h3>
              <ProgressPipeline
                stage={jobStatus.stage}
                progress={jobStatus.progress}
                status={jobStatus.status}
              />
            </div>
          )}

          {/* Video preview */}
          <div className="card">
            <h3 className="section-title">Video Preview</h3>
            <video
              ref={videoPreviewRef}
              controls
              className="w-full rounded-lg bg-slate-900 max-h-52 object-contain"
              aria-label="Uploaded video preview"
            />
          </div>
        </div>
      )}

      {/* Video preview when no pipeline yet */}
      {file && stage === 'idle' && (
        <div className="card">
          <h3 className="section-title">Video Preview</h3>
          <video
            ref={videoPreviewRef}
            controls
            className="w-full rounded-lg bg-slate-900 max-h-52 object-contain"
            aria-label="Uploaded video preview"
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <ResultsPanel result={result} />
          <AnnotatedFrames frames={result.frame_results || []} />
        </>
      )}
    </div>
  )
}
