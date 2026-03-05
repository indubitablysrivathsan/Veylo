import { useState, useEffect, useCallback, useRef } from 'react'
import type { PipelineStage, ValidationPipelineState, ValidationReport } from '@/types'
import { mockPipelineStages, mockValidationReportPass } from '@/lib/mockData'

const STAGE_DELAY_MS = 1800

export function useValidationPipeline(jobId: number | null, autoStart = false) {
    const [pipelineState, setPipelineState] = useState<ValidationPipelineState>({
        stages: mockPipelineStages.map(s => ({ ...s, status: 'pending' as const, score: null, details: null })),
        currentStage: -1,
        isComplete: false,
        finalReport: null,
    })
    const [isRunning, setIsRunning] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const advanceStage = useCallback((stageIndex: number) => {
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
                    finalReport: isLast ? mockValidationReportPass : null,
                }
            })

            if (stageIndex < mockPipelineStages.length - 1) {
                timerRef.current = setTimeout(() => advanceStage(stageIndex + 1), 400)
            } else {
                setIsRunning(false)
            }
        }, STAGE_DELAY_MS)
    }, [])

    const startPipeline = useCallback(() => {
        setIsRunning(true)
        setPipelineState({
            stages: mockPipelineStages.map(s => ({ ...s, status: 'pending' as const, score: null, details: null })),
            currentStage: -1,
            isComplete: false,
            finalReport: null,
        })
        setTimeout(() => advanceStage(0), 500)
    }, [advanceStage])

    useEffect(() => {
        if (autoStart && jobId !== null) {
            startPipeline()
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [autoStart, jobId, startPipeline])

    return { pipelineState, isRunning, startPipeline }
}
