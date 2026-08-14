export type MoodKeyword = '도시적' | '시크' | '미니멀' | '자연스러운' | '따뜻한' | '선명한';

export type StylingCategory = 'hair' | 'makeup' | 'color' | 'fashion';

export type AnalysisResult = {
  id: string;
  targetMoods: MoodKeyword[];
  currentImpression: string[];
  priorities: {
    category: StylingCategory;
    title: string;
    description: string;
  }[];
  disclaimer: string;
};
