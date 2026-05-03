import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function InterviewDetail() {
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [candidateId])

  const fetchData = async () => {
    try {
      const [cRes, rRes] = await Promise.all([
        api.get(`/api/candidates/${candidateId}`),
        api.get(`/api/evaluation/${candidateId}`),
      ])
      if (cRes.ok) setCandidate(await cRes.json())
      if (rRes.ok) setReport(await rRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await api.post(`/api/evaluation/generate?candidate_id=${candidateId}`)
      if (res.ok) {
        setReport(await res.json())
      }
    } catch (err) {
      alert('生成失败：' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-slate-400">加载中...</p></div>
  if (!candidate) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-slate-400">候选人不存在</p></div>

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white mr-4">← 返回</button>
          <h1 className="text-xl font-semibold text-white">面试详情 - {candidate.name}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Basic Info */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-base font-medium text-white mb-4">基本信息</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-slate-400">姓名</p><p className="text-white mt-1">{candidate.name}</p></div>
            <div><p className="text-slate-400">联系方式</p><p className="text-white mt-1">{candidate.contact || '-'}</p></div>
            <div><p className="text-slate-400">面试状态</p><p className="text-white mt-1">{candidate.interview_status}</p></div>
            <div><p className="text-slate-400">得分</p><p className="text-white mt-1">{candidate.score ?? '未评分'}</p></div>
          </div>
          {candidate.education && (
            <div className="mt-4"><p className="text-slate-400 mb-1">教育背景</p><p className="text-slate-300 text-sm whitespace-pre-wrap">{candidate.education}</p></div>
          )}
          {candidate.work_experience && (
            <div className="mt-4"><p className="text-slate-400 mb-1">工作经历</p><p className="text-slate-300 text-sm whitespace-pre-wrap">{candidate.work_experience}</p></div>
          )}
        </section>

        {/* Report */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-white">评估报告</h2>
            {!report && !generating && (
              <button onClick={handleGenerate} disabled={generating} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500">
                生成报告
              </button>
            )}
            {generating && <p className="text-sm text-slate-400">生成中...</p>}
          </div>

          {report && (
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">{report.overall_score ?? '-'}</p>
                  <p className="text-xs text-slate-400 mt-1">总分</p>
                </div>
                {report.dimension_scores && (
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(report.dimension_scores).map(([dim, score]) => (
                      <div key={dim} className="bg-slate-900 rounded-lg p-3 text-center">
                        <p className="text-sm text-slate-300">{dim}</p>
                        <p className="text-lg font-semibold text-white mt-1">{score}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {report.strengths && (
                <div><p className="text-sm text-slate-400 mb-1">优势分析</p><p className="text-sm text-slate-300 whitespace-pre-wrap">{report.strengths}</p></div>
              )}
              {report.weaknesses && (
                <div><p className="text-sm text-slate-400 mb-1">待改进点</p><p className="text-sm text-slate-300 whitespace-pre-wrap">{report.weaknesses}</p></div>
              )}
              {report.ai_comments && (
                <div><p className="text-sm text-slate-400 mb-1">AI 综合评价</p><p className="text-sm text-slate-300 whitespace-pre-wrap">{report.ai_comments}</p></div>
              )}
              {report.anti_cheat_log && report.anti_cheat_log.length > 0 && (
                <div>
                  <p className="text-sm text-yellow-400 mb-2">防作弊记录 ({report.anti_cheat_log.length} 条)</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {report.anti_cheat_log.map((log, i) => (
                      <li key={i}>{new Date(log.time).toLocaleString('zh-CN')} - {log.event}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Conversation History */}
        {report && report.conversation_history && report.conversation_history.length > 0 && (
          <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-base font-medium text-white mb-4">面试对话记录</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {report.conversation_history.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
