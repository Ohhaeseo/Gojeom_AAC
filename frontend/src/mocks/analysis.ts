import type { AnalysisResult } from '@/types/analysis';

export const mockAnalysis: AnalysisResult = {
  id: 'demo-analysis-001',
  targetMoods: ['도시적', '시크', '미니멀'],
  currentImpression: ['부드러운 인상', '자연스러운 스타일', '밝고 편안한 분위기'],
  priorities: [
    { category: 'hair', title: '얼굴선을 드러내는 헤어', description: '정돈된 실루엣으로 목표 분위기를 강화해요.' },
    { category: 'makeup', title: '저채도 메이크업', description: '차분한 컬러와 정돈된 눈썹을 먼저 시도해요.' },
    { category: 'fashion', title: '직선적인 액세서리', description: '간결한 형태를 선택해 미니멀한 인상을 더해요.' },
  ],
  disclaimer: '현재 얼굴의 고유한 특징은 유지하면서 스타일링 요소를 통해 목표 분위기를 강화합니다.',
};
