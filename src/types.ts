export interface Bill {
  indexId: string;
  reference: string;
  name: string;
  stage: string;
  category: string;
  year: string;
  viewUrl: string;
  downloadUrl: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
