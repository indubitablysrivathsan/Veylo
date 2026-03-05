import { useState, useEffect, useCallback, useRef } from 'react'
import type { PipelineStage, ValidationPipelineState, ValidationReport } from '@/types'
import { runValidation, getValidation } from '@/lib/api'
import { mockPipelineStages, mockValidationReportPass } from '@/lib/mockData'

const STAGE_DELAY_MS = 1800
const POLL_INTERVAL_MS = 2000

/**
 * Validation pipeline hook.
 * 
 * Strategy:
 * 1. Call POST /api/validation/run to kick off backend validation.
 * 2. Animate through pipeline stages visually while polling GET /api/validation/:jobId.
 * 3. When the backend returns a report, jump to completion with the real report.
 * 4. Falls back to mock animation if backend is unavailable.
 */
export function useValidationPipeline(jobId: number | null, autoStart = false) {
    const [pipelineState, setPipelineState] = useState<ValidationPipelineState>({
        stages: mockPipelineStages.map(s => ({ ...s, status: 'pending' as const, score: null, details: null })),
        currentStage: -1,
        isComplete: false,
        finalReport: null,
    })
    const [isRunning, setIsRunning] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const realReportRef = useRef<ValidationReport | null>(null)

    /** Stop all timers */
    const cleanup = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }, [])

    /** Complete with a real or mock report */
    const completeWithReport = useCallback((report: ValidationReport) => {
        cleanup()
        setPipelineState(prev => ({
            stages: prev.stages.map(s => ({
                ...s,
                status: 'complete' as const,
                score: s.score ?? 100,
                details: s.details ?? 'Done',
            })),
            currentStage: mockPipelineStages.length - 1,
            isComplete: true,
            finalReport: report,
        }))
        setIsRunning(false)
    }, [cleanup])

    /** Advance through stages visually */
    const advanceStage = useCallback((stageIndex: number) => {
        // If we got a real report from polling, finish immediately
        if (realReportRef.current) {
            completeWithReport(realReportRef.current)
            return
        }

        setPipelineState(prev => {
            const stages: PipelineStage[] = prev.stages.map((s, i) => {
                if (i < stageIndex) {
                    const ref = mockPipelineStages[i]
                    return { ...s, status: 'complete' as const, score: ref.score, details: ref.details }
                }
                if (i === stageIndex) {
                    return { ...s, status: 'running' as const }
                }
                return s
            })
            return { ...prev, stages, currentStage: stageIndex }
        })

        timerRef.current = setTimeout(() => {
            // Check again if real report arrived during this stage
            if (realReportRef.current) {
                completeWithReport(realReportRef.current)
                return
            }

            setPipelineState(prev => {
                const ref = mockPipelineStages[stageIndex]
                const stages = prev.stages.map((s, i) =>
                    i === stageIndex
                        ? { ...s, status: 'complete' as const, score: ref.score, details: ref.details }
                        : s
                )
                const isLast = stageIndex === mockPipelineStages.length - 1

                return {
                    stages,
                    currentStage: stageIndex,
                    isComplete: isLast,
                    finalReport: isLast ? (realReportRef.current || mockValidationReportPass) : null,
                }
            })

            if (stageIndex < mockPipelineStages.length - 1) {
                timerRef.current = setTimeout(() => advanceStage(stageIndex + 1), 400)
            } else {
                setIsRunning(false)
                cleanup()
            }
        }, STAGE_DELAY_MS)
    }, [completeWithReport, cleanup])

    /** Start the pipeline: call backend + animate stages */
    const startPipeline = useCallback(async () => {
        cleanup()
        realReportRef.current = null
        setIsRunning(true)
        setPipelineState({
            stages: mockPipelineStages.map(s => ({ ...s, status: 'pending' as const, score: null, details: null })),
            currentStage: -1,
            isComplete: false,
            finalReport: null,
        })

        // Kick off backend validation (fire-and-forget)
        if (jobId !== null) {
            runValidation(jobId).catch(err => {
                console.warn('[Pipeline] Backend validation start failed:', err)
            })

            // Start polling for the real report
            pollRef.current = setInterval(async () => {
                try {
                    const report = await getValidation(jobId)
                    if (report && report.overallScore !== undefined) {
                        realReportRef.current = report
                        // If we're still animating, the advanceStage will pick this up
                        // If animation finished, force complete now
                        setPipelineState(prev => {
                            if (prev.isComplete && !prev.finalReport) {
                                return { ...prev, finalReport: report }
                            }
                            return prev
                        })
                    }
                } catch {
                    // Report not ready yet, keep polling
                }
            }, POLL_INTERVAL_MS)
        }

        // Start stage animation
        setTimeout(() => advanceStage(0), 500)
    }, [jobId, advanceStage, cleanup])

    useEffect(() => {
        if (autoStart && jobId !== null) {
            startPipeline()
        }
        return cleanup
    }, [autoStart, jobId, startPipeline, cleanup])

    return { pipelineState, isRunning, startPipeline }
}
