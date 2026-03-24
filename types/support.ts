export type NoticeItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
};

export type SupportReportDraft = {
  locationName: string;
  issueType: "주소오류" | "폐업" | "정보불일치" | "기타";
  description: string;
  contact: string;
};

export type SupportFeedbackDraft = {
  category: "기능제안" | "사용성" | "버그" | "기타";
  message: string;
  contact: string;
};

export type FeedbackSubmitRequest = {
  satisfactionScore: number;
  hasError: boolean;
  errorDetail: string;
  content: string;
};

export type FeedbackSubmitResponse = {
  resultCode: string;
  feebackId?: number;
  feedbackId?: number;
};
